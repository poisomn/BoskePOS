"""Regression evidence for the MVP v0.2.1 technical audit."""
from datetime import timedelta
from decimal import Decimal
from io import StringIO
import json

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import DatabaseError
from django.test import RequestFactory
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.inventory.models import Product, StockMovement
from apps.inventory.serializers import ProductSerializer
from apps.inventory.services import apply_stock_movement
from apps.purchases.models import Purchase
from apps.purchases.services import PurchaseConflict, confirm_purchase, discard_purchase_draft, save_purchase_draft
from apps.suppliers.models import Supplier
from .models import Sale
from .services import register_sale


class AuditRegressionTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_superuser(email='audit@example.test', password=None)
        cls.product = Product.objects.create(name='Audit product', sku='AUDIT', sale_price='1190', stock=10)
        cls.supplier = Supplier.objects.create(name='Audit supplier')

    def setUp(self):
        self.client.force_authenticate(self.user)
        from apps.cash.models import CashRegister, CashSession
        CashSession.objects.create(register=CashRegister.objects.create(name='Test till'), cashier=self.user, opening_amount=0)

    def test_catalog_edit_cannot_overwrite_a_concurrent_stock_movement(self):
        serializer = ProductSerializer(self.product, data={'name': 'New name'}, partial=True)
        serializer.is_valid(raise_exception=True)
        apply_stock_movement(product=self.product, movement_type='exit', quantity=2,
                             reason='Sale while editing', user=self.user)
        serializer.save()
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_stale_purchase_draft_cannot_modify_a_confirmed_purchase(self):
        draft = save_purchase_draft(user=self.user, supplier=self.supplier,
            items=[{'product_id': self.product.pk, 'quantity': 2, 'unit_cost': Decimal('500')}])
        confirm_purchase(purchase=draft, user=self.user)
        with self.assertRaises(PurchaseConflict):
            save_purchase_draft(user=self.user, supplier=self.supplier, purchase=draft,
                items=[{'product_id': self.product.pk, 'quantity': 7, 'unit_cost': Decimal('900')}])
        draft.refresh_from_db()
        self.assertEqual(draft.total, Decimal('1000'))

    def test_transaction_admin_is_read_only_even_for_superuser(self):
        request = RequestFactory().get('/admin/')
        request.user = self.user
        for model in (Sale, Purchase, StockMovement):
            with self.subTest(model=model.__name__):
                model_admin = admin.site._registry[model]
                self.assertFalse(model_admin.has_add_permission(request))
                self.assertFalse(model_admin.has_change_permission(request))
                self.assertFalse(model_admin.has_delete_permission(request))
        self.assertIn('stock', admin.site._registry[Product].get_readonly_fields(request))

    def test_partial_sale_update_preserves_items_and_payment(self):
        sale = register_sale(user=self.user, status='pending', payment_method='transfer',
            items=[{'product_id': self.product.pk, 'quantity': 2}])
        original_item = sale.items.get().pk
        response = self.client.patch(reverse('sales:sale-detail', args=[sale.pk]),
                                     {'notes': 'Updated note only'}, format='json')
        self.assertEqual(response.status_code, 200)
        sale.refresh_from_db()
        self.assertEqual(sale.notes, 'Updated note only')
        self.assertEqual(sale.payment_method, 'transfer')
        self.assertEqual(sale.items.get().pk, original_item)
        self.assertEqual(sale.total, Decimal('2380'))

    def test_invalid_filters_return_400_instead_of_500(self):
        self.client.raise_request_exception = False
        cases = [
            ('/api/sales/sales/', {'date_from': '2026-02-30'}),
            ('/api/sales/sales/', {'customer': 'abc'}),
            ('/api/purchases/purchases/', {'date_to': 'not-a-date'}),
            ('/api/purchases/purchases/', {'supplier': '-1'}),
            ('/api/inventory/products/', {'category': 'abc'}),
            ('/api/inventory/movements/', {'date_to': '2026-02-30'}),
            ('/api/inventory/movements/', {'product': 'abc'}),
            ('/api/dashboard/summary/', {'date': '2026-02-30'}),
            ('/api/sales/sales/', {'date_from': '2026-09-15', 'date_to': '2026-09-01'}),
        ]
        for url, params in cases:
            with self.subTest(url=url, params=params):
                self.assertEqual(self.client.get(url, params).status_code, 400)

    def test_dashboard_counts_suspended_sale_on_completion_day(self):
        sale = register_sale(user=self.user, items=[{'product_id': self.product.pk, 'quantity': 1}])
        Sale.objects.filter(pk=sale.pk).update(created_at=timezone.now() - timedelta(days=2))
        response = self.client.get(reverse('dashboard:summary'), {'date': timezone.localdate().isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['sales']['count'], 1)
        self.assertEqual(response.data['sales']['daily'][0]['total'], '1190.00')
        self.assertEqual(response.data['sales']['top_products'][0]['quantity'], 1)

    def test_protected_product_deletion_returns_conflict(self):
        register_sale(user=self.user, items=[{'product_id': self.product.pk, 'quantity': 1}])
        self.client.raise_request_exception = False
        response = self.client.delete(f'/api/inventory/products/{self.product.pk}/')
        self.assertEqual(response.status_code, 409)

    def test_pos_search_is_bounded(self):
        Product.objects.bulk_create(Product(name=f'Audit {i}', sku=f'AUDIT-{i}', sale_price=1)
                                    for i in range(30))
        response = self.client.get(reverse('sales:pos-product-search'), {'search': 'Audit'})
        self.assertLessEqual(len(response.data), 20)

    def test_stale_purchase_draft_cannot_delete_a_confirmed_purchase(self):
        draft = save_purchase_draft(user=self.user, supplier=self.supplier,
            items=[{'product_id': self.product.pk, 'quantity': 2, 'unit_cost': Decimal('500')}])
        confirm_purchase(purchase=draft, user=self.user)
        with self.assertRaises(PurchaseConflict):
            discard_purchase_draft(purchase=draft)
        self.assertTrue(Purchase.objects.filter(pk=draft.pk).exists())

    def test_seller_can_read_receipt_identity_but_cannot_edit_settings(self):
        call_command('seed_roles', verbosity=0)
        seller = get_user_model().objects.create_user(email='seller@example.test', password=None)
        seller.groups.add(Group.objects.get(name='vendedor'))
        self.client.force_authenticate(seller)
        response = self.client.get('/api/settings/receipt/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('business_name', response.data)
        self.assertNotIn('default_tax_rate', response.data)
        self.assertEqual(self.client.patch('/api/settings/business/', {'business_name': 'Forbidden'}).status_code, 403)
        self.assertEqual(self.client.patch('/api/settings/receipt/', {'business_name': 'Forbidden'}).status_code, 405)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/settings/receipt/').status_code, 401)

    def test_login_is_throttled(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client.force_authenticate(None)
        responses = [self.client.post(reverse('accounts:login'), {}, format='json') for _ in range(11)]
        self.assertEqual(responses[0].status_code, 400)
        self.assertEqual(responses[-1].status_code, 429)
        self.assertIn('Retry-After', responses[-1])

    def test_health_reports_database_outage_without_details(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/health/').status_code, 200)
        with patch('config.health.connection.cursor', side_effect=DatabaseError('private infrastructure')):
            response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})

    def test_kardex_search_includes_transaction_reference(self):
        sale = register_sale(user=self.user, items=[{'product_id': self.product.pk, 'quantity': 1}])
        response = self.client.get('/api/inventory/movements/', {'search': f'sale:{sale.pk}'})
        self.assertEqual(response.data['count'], 1)

    def test_excessive_sale_amount_is_rejected_without_partial_writes(self):
        Product.objects.filter(pk=self.product.pk).update(sale_price=Decimal('9999999999.99'))
        response = self.client.post('/api/sales/sales/',
            {'items': [{'product_id': self.product.pk, 'quantity': 2}]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_excessive_purchase_amount_is_rejected_without_partial_writes(self):
        response = self.client.post('/api/purchases/purchases/',
            {'supplier_id': self.supplier.pk, 'items': [
                {'product_id': self.product.pk, 'quantity': 2, 'unit_cost': '9999999999.99'}]}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Purchase.objects.count(), 0)

    def test_stock_audit_detects_missing_history_without_modifying_data(self):
        output = StringIO()
        with self.assertRaises(CommandError):
            call_command('audit_stock', strict=True, stdout=output)
        report = json.loads(output.getvalue())
        self.assertEqual(report['issues'][0]['issue'], 'stock_mismatch')
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_stock_audit_accepts_a_complete_ledger(self):
        Product.objects.filter(pk=self.product.pk).update(stock=0)
        apply_stock_movement(product=self.product, movement_type='entry', quantity=2,
                             reason='Opening stock', user=self.user)
        output = StringIO()
        call_command('audit_stock', strict=True, stdout=output)
        self.assertEqual(json.loads(output.getvalue())['issues'], [])
