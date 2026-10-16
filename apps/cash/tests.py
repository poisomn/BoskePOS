from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import apply_stock_movement
from apps.sales.models import Sale
from apps.sales.services import register_sale, complete_sale
from .models import CashRegister, CashSession, CashMovement
from .services import session_summary


class OperationsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_roles', verbosity=0)
        cls.admin = get_user_model().objects.create_user(email='admin@operations.test', password='Valid-Personal-Password-32', authorization_pin_hash=make_password('1234'))
        cls.admin.groups.add(Group.objects.get(name='administrador'))
        cls.seller = get_user_model().objects.create_user(email='seller@operations.test', password=None)
        cls.seller.groups.add(Group.objects.get(name='vendedor'))
        cls.other = get_user_model().objects.create_user(email='other@operations.test', password=None)
        cls.other.groups.add(Group.objects.get(name='vendedor'))
        cls.register = CashRegister.objects.create(name='Principal')
        cls.product = Product.objects.create(name='Tornillo', sku='TOR-1', stock=20, sale_price='1190', cost_price='500')

    def setUp(self):
        self.client.force_authenticate(self.seller)

    def open(self):
        response = self.client.post('/api/cash/sessions/open/', {'register': self.register.pk, 'opening_amount': '10000'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return CashSession.objects.get(pk=response.data['id'])

    def sell(self, **changes):
        data = {'items': [{'product_id': self.product.pk, 'quantity': 1}], **changes}
        return self.client.post(reverse('sales:sale-list'), data, format='json')

    def close(self, session, **changes):
        payload = {'counted': session_summary(session)['expected'], 'notes': '', 'admin_id': self.admin.pk, 'pin': '1234', **changes}
        return self.client.post(f'/api/cash/sessions/{session.pk}/close/', payload, format='json')

    def test_opening_required_for_payment_but_not_preparing_a_sale(self):
        self.assertEqual(self.sell().status_code, 400)
        self.assertEqual(self.sell(status='pending').status_code, 201)
        self.assertEqual(CashMovement.objects.count(), 0)

    def test_register_and_cashier_cannot_have_two_open_turns(self):
        self.open()
        self.assertEqual(self.client.post('/api/cash/sessions/open/', {'register': self.register.pk, 'opening_amount': 0}).status_code, 400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post('/api/cash/sessions/open/', {'register': self.register.pk, 'opening_amount': 0}).status_code, 400)

    def test_cash_vuelto_and_non_cash_are_not_mixed(self):
        session = self.open()
        self.assertEqual(self.sell(amount_paid='5000').status_code, 201)
        self.assertEqual(self.sell(payment_method='debit').status_code, 201)
        summary = session_summary(session)
        self.assertEqual(Decimal(summary['expected']['cash']), Decimal('11190'))
        self.assertEqual(Decimal(summary['expected']['debit']), Decimal('1190'))

    def test_movements_require_reason_and_cannot_overdraw(self):
        session = self.open()
        path = f'/api/cash/sessions/{session.pk}/movements/'
        self.assertEqual(self.client.post(path, {'kind': 'withdrawal', 'amount': '10001', 'reason': 'Banco'}).status_code, 400)
        self.assertEqual(self.client.post(path, {'kind': 'entry', 'amount': '1', 'reason': ''}).status_code, 400)
        self.assertEqual(self.client.post(path, {'kind': 'withdrawal', 'amount': '2000', 'reason': 'Banco'}).status_code, 201)
        self.assertEqual(Decimal(session_summary(session)['expected']['cash']), Decimal('8000'))

    def test_only_owner_can_move_cash_and_only_admin_can_create_registers(self):
        session = self.open()
        self.client.force_authenticate(self.other)
        response = self.client.post(f'/api/cash/sessions/{session.pk}/movements/', {'kind': 'entry', 'amount': 1, 'reason': 'Test'})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.post('/api/cash/registers/', {'name': 'Unauthorized'}).status_code, 403)

    def test_close_requires_all_methods_and_explanation_for_difference(self):
        session = self.open()
        self.assertEqual(self.close(session, counted={'cash': '10000'}).status_code, 400)
        counted = {'cash': '9900', 'debit': '0', 'credit': '0', 'transfer': '0'}
        self.assertEqual(self.close(session, counted=counted).status_code, 400)
        response = self.close(session, counted=counted, notes='Faltante revisado')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['summary']['differences']['cash'], '-100.00')
        session.refresh_from_db()
        self.assertEqual(session.counted_by, self.seller)
        self.assertEqual(session.authorized_by, self.admin)

    def test_bad_pin_attempts_persist_and_block_even_correct_pin(self):
        session = self.open()
        for _ in range(5):
            self.assertEqual(self.close(session, pin='9999').status_code, 403)
        self.admin.refresh_from_db()
        self.assertIsNotNone(self.admin.pin_locked_until)
        self.assertEqual(self.close(session).status_code, 403)
        session.refresh_from_db()
        self.assertIsNone(session.closed_at)

    def test_seller_and_inactive_admin_cannot_authorize(self):
        session = self.open()
        self.assertEqual(self.close(session, admin_id=self.seller.pk).status_code, 403)
        self.admin.is_active = False
        self.admin.save(update_fields=('is_active',))
        self.assertEqual(self.close(session).status_code, 403)

    def test_closed_summary_cannot_be_changed_and_refund_uses_new_turn(self):
        session = self.open()
        sale = self.sell()
        self.assertEqual(sale.status_code, 201)
        closed = self.close(session)
        self.assertEqual(closed.status_code, 200)
        snapshot = closed.data['summary']
        self.assertEqual(self.close(session).status_code, 400)
        self.assertEqual(self.client.post(f'/api/cash/sessions/{session.pk}/movements/', {'kind': 'entry', 'amount': 1, 'reason': 'Late'}).status_code, 400)
        self.assertEqual(self.sell().status_code, 400)
        self.client.force_authenticate(self.admin)
        second = self.open()
        response = self.client.post(reverse('sales:sale-cancel', args=[sale.data['id']]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CashMovement.objects.get(kind='refund').session, second)
        session.refresh_from_db()
        self.assertEqual(session.closing_summary, snapshot)

    def test_idempotent_create_replays_once_and_rejects_modified_payload(self):
        session = self.open()
        key = str(uuid4())
        first = self.sell(idempotency_key=key)
        second = self.sell(idempotency_key=key)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(CashMovement.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)
        self.assertEqual(self.sell(idempotency_key=key, notes='Changed').status_code, 400)
        self.assertEqual(self.close(session).status_code, 200)
        self.assertEqual(self.sell(idempotency_key=key).data['id'], first.data['id'])

    def test_seller_discount_limit_and_admin_pin_enforced_in_backend(self):
        self.open()
        items = [{'product_id': self.product.pk, 'quantity': 1, 'discount_percent': 10}]
        self.assertEqual(self.sell(items=items, discount_reason='Oferta').status_code, 400)
        self.assertEqual(self.sell(items=items, discount_reason='Oferta', admin_id=self.admin.pk, pin='9999').status_code, 403)
        result = self.sell(items=items, discount_reason='Oferta', admin_id=self.admin.pk, pin='1234')
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data['discount_total'], '119.00')
        self.assertEqual(result.data['discount_authorized_by'], self.admin.pk)

    def test_discount_requires_reason_and_cannot_use_amount_and_percent_together(self):
        self.open()
        items = [{'product_id': self.product.pk, 'quantity': 1, 'discount_percent': 5}]
        self.assertEqual(self.sell(items=items).status_code, 400)
        items[0]['discount_amount'] = '10'
        self.assertEqual(self.sell(items=items, discount_reason='Offer').status_code, 400)

    def test_discount_rounds_collectible_total_to_whole_pesos_and_records_adjustment(self):
        self.open()
        result = self.sell(items=[{'product_id': self.product.pk, 'quantity': 1, 'discount_percent': 5}], discount_reason='Oferta', amount_paid='5000')
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data['discount_total'], '59.50')
        self.assertEqual(result.data['rounding_adjustment'], '0.50')
        self.assertEqual(result.data['total'], '1131.00')
        self.assertEqual(result.data['change_amount'], '3869.00')
        sale = Sale.objects.get(pk=result.data['id'])
        self.assertEqual(sum(item.line_total for item in sale.items.all()), sale.total)
        self.assertEqual(sale.subtotal - sale.discount_total + sale.rounding_adjustment, sale.total)

    def test_fractional_cash_is_rejected(self):
        self.open()
        self.assertEqual(self.sell(amount_paid='5000.50').status_code, 400)

    def test_pending_sale_preserves_seller_and_captures_cost_on_collection(self):
        sale = register_sale(user=self.other, items=[{'product_id': self.product.pk, 'quantity': 1}], status='pending')
        self.open()
        self.product.cost_price = Decimal('600')
        self.product.save(update_fields=('cost_price',))
        key = uuid4()
        sale = complete_sale(sale=sale, user=self.seller, idempotency_key=key)
        self.assertEqual(sale.user, self.other)
        self.assertEqual(sale.cashier, self.seller)
        self.assertEqual(sale.items.get().unit_cost, Decimal('600'))
        self.assertEqual(complete_sale(sale=sale, user=self.seller, idempotency_key=key).pk, sale.pk)
        self.product.cost_price = Decimal('900')
        self.product.save(update_fields=('cost_price',))
        self.assertEqual(sale.items.get().unit_cost, Decimal('600'))

    def test_internal_use_and_waste_keep_stock_trace_and_reference(self):
        self.client.force_authenticate(self.admin)
        for kind in ('internal_use', 'waste'):
            response = self.client.post(f'/api/inventory/products/{self.product.pk}/adjust-stock/', {'movement_type': kind, 'quantity': 2, 'reason': 'Retiro a obra', 'reference': 'OBRA-5'})
            self.assertEqual(response.status_code, 201, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 16)
        self.assertEqual(StockMovement.objects.filter(reference='OBRA-5').count(), 2)

    def test_monthly_activity_has_twelve_months_and_permissions(self):
        path = f'/api/inventory/products/{self.product.pk}/monthly-activity/'
        self.assertEqual(self.client.get(path).status_code, 403)
        self.client.force_authenticate(self.admin)
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['months']), 12)
        self.assertEqual(self.client.get(path, {'year': 'invalid'}).status_code, 400)

    def test_only_admin_can_set_own_pin_and_pin_is_never_returned(self):
        path = '/api/cash/users/my-pin/'
        self.assertEqual(self.client.post(path, {'pin': '0000', 'password': 'anything'}).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(path, {'pin': '0000', 'password': 'incorrect'}).status_code, 400)
        response = self.client.post(path, {'pin': '0000', 'password': 'Valid-Personal-Password-32'})
        self.assertEqual(response.status_code, 200)
        users = self.client.get('/api/cash/users/')
        self.assertNotIn('authorization_pin_hash', str(users.data))
        self.assertNotIn('0000', str(users.data))

    def test_removing_admin_role_revokes_pin(self):
        another = get_user_model().objects.create_superuser(email='owner@operations.test', password=None)
        self.client.force_authenticate(another)
        response = self.client.patch(f'/api/cash/users/{self.admin.pk}/', {'role': 'vendedor'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.authorization_pin_hash, '')

    def test_app_admin_cannot_take_over_superuser_account(self):
        owner = get_user_model().objects.create_superuser(email='protected@operations.test', password=None)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/cash/users/{owner.pk}/', {'password': 'New-Valid-Password-2026!'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.client.force_authenticate(owner)
        response = self.client.patch(f'/api/cash/users/{owner.pk}/', {'first_name': 'Propietario', 'role': 'administrador'}, format='json')
        self.assertEqual(response.status_code, 200)
