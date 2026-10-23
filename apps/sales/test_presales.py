from datetime import timedelta
from decimal import Decimal
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase
from apps.cash.models import CashMovement, CashRegister, CashSession
from apps.inventory.models import Product
from .models import OperationEvent, PresaleStation, PresaleTicket


class PresaleTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_roles', verbosity=0)
        cls.seller = get_user_model().objects.create_user(email='vendor@pre.test')
        cls.seller.groups.add(Group.objects.get(name='vendedor'))
        cls.cashier = get_user_model().objects.create_user(email='cashier@pre.test')
        cls.cashier.groups.add(Group.objects.get(name='cajero'))
        cls.other = get_user_model().objects.create_user(email='other@pre.test')
        cls.other.groups.add(Group.objects.get(name='cajero'))
        cls.admin = get_user_model().objects.create_superuser(email='admin@pre.test')
        cls.product = Product.objects.create(name='Producto', sku='PRE-1', stock=10, sale_price='1190', cost_price='500')
        cls.station = PresaleStation.objects.create(name='Mesón')
        cls.box = CashRegister.objects.create(name='Caja venta')
        CashSession.objects.create(register=cls.box, cashier=cls.cashier, opening_amount=0)
        cls.otherbox = CashRegister.objects.create(name='Otra caja')
        CashSession.objects.create(register=cls.otherbox, cashier=cls.other, opening_amount=0)

    def issue(self, key=None, **extra):
        self.client.force_authenticate(self.seller)
        data = {'station': self.station.pk, 'idempotency_key': str(key or uuid4()), 'items': [{'product_id': self.product.pk, 'quantity': 2}], **extra}
        response = self.client.post('/api/presales/tickets/', data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def action(self, ticket, name, data=None, user=None):
        self.client.force_authenticate(user or self.cashier)
        return self.client.post(f'/api/presales/tickets/{ticket["id"]}/{name}/', data or {}, format='json')

    def test_issue_has_no_cash_or_stock_effect_and_is_idempotent(self):
        key = uuid4()
        ticket = self.issue(key)
        self.assertEqual(self.issue(key)['id'], ticket['id'])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(CashMovement.objects.count(), 0)
        self.assertEqual(PresaleTicket.objects.count(), 1)

    def test_only_claim_owner_can_collect_and_payment_retries_are_idempotent(self):
        ticket = self.issue()
        self.assertEqual(self.action(ticket, 'take').status_code, 200)
        self.assertEqual(self.action(ticket, 'take', user=self.other).status_code, 409)
        key = str(uuid4()); payload = {'payment_method': 'debit', 'idempotency_key': key}
        self.assertEqual(self.action(ticket, 'complete', payload, self.other).status_code, 409)
        paid = self.action(ticket, 'complete', payload)
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data['status'], 'paid')
        self.assertEqual(self.action(ticket, 'complete', payload).status_code, 200)
        self.assertEqual(self.action(ticket, 'complete', {**payload, 'idempotency_key': str(uuid4())}).status_code, 409)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        self.assertEqual(CashMovement.objects.count(), 1)

    def test_failed_payment_rolls_back_stock_and_keeps_claim(self):
        ticket = self.issue(); self.action(ticket, 'take')
        response = self.action(ticket, 'complete', {'payment_method': 'cash', 'amount_paid': '1', 'idempotency_key': str(uuid4())})
        self.assertEqual(response.status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(PresaleTicket.objects.get(pk=ticket['id']).status, 'claimed')

    def test_price_change_requires_explicit_review(self):
        ticket = self.issue()
        Product.objects.filter(pk=self.product.pk).update(sale_price='2380')
        self.assertEqual(self.action(ticket, 'take').status_code, 409)
        response = self.action(ticket, 'reprice', user=self.seller)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Decimal(response.data['sale']['total']), Decimal('4760'))
        self.assertEqual(self.action(ticket, 'take').status_code, 200)

    def test_stock_is_revalidated_at_payment(self):
        ticket = self.issue(); self.action(ticket, 'take')
        Product.objects.filter(pk=self.product.pk).update(stock=1)
        self.assertEqual(self.action(ticket, 'complete', {'payment_method': 'debit', 'idempotency_key': str(uuid4())}).status_code, 400)
        self.assertEqual(CashMovement.objects.count(), 0)

    def test_expired_tickets_and_expired_claims_cannot_be_collected(self):
        ticket = self.issue(); self.action(ticket, 'take')
        PresaleTicket.objects.filter(pk=ticket['id']).update(claim_until=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.action(ticket, 'complete', {'idempotency_key': str(uuid4())}).status_code, 409)
        self.assertEqual(self.action(ticket, 'take', user=self.other).status_code, 200)
        PresaleTicket.objects.filter(pk=ticket['id']).update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.action(ticket, 'take').status_code, 409)

    def test_legacy_sale_endpoints_cannot_bypass_presale(self):
        ticket = self.issue(); sale = ticket['sale']['id']
        self.client.force_authenticate(self.seller)
        for action in ('complete', 'discard'):
            self.assertEqual(self.client.post(f'/api/sales/sales/{sale}/{action}/', {}, format='json').status_code, 409)
        self.assertEqual(self.client.patch(f'/api/sales/sales/{sale}/', {'notes': 'bypass'}, format='json').status_code, 409)

    def test_cashier_cannot_issue_or_configure_stations_or_cancel(self):
        ticket = self.issue()
        self.client.force_authenticate(self.cashier)
        self.assertEqual(self.client.post('/api/presales/stations/', {'name': 'No'}).status_code, 403)
        self.assertEqual(self.client.post('/api/presales/tickets/', {}).status_code, 403)
        self.assertEqual(self.action(ticket, 'cancel', {'reason': 'No'}).status_code, 403)
        self.assertEqual(self.client.get('/api/presales/audit/').status_code, 403)

    def test_supervisor_cancel_keeps_audit_and_does_not_move_stock(self):
        ticket = self.issue()
        self.assertEqual(self.action(ticket, 'cancel', {'reason': 'Cliente desistió'}, self.admin).status_code, 200)
        self.assertEqual(self.action(ticket, 'take').status_code, 409)
        self.assertTrue(OperationEvent.objects.filter(entity_id=str(ticket['id']), action='cancelled').exists())
        self.product.refresh_from_db(); self.assertEqual(self.product.stock, 10)
