from decimal import Decimal
from uuid import uuid4
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.inventory.models import Product, StockMovement
from apps.suppliers.models import Supplier
from .models import Purchase


class ReceiptTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(email='receipt@test.local')
        self.client.force_authenticate(self.user)
        self.product = Product.objects.create(name='Material', sku='REC-1', stock=2, minimum_stock=8, cost_price='1000', sale_price='1500')
        self.supplier = Supplier.objects.create(name='Proveedor', rut='12345678-5')
        response = self.client.post('/api/purchases/purchases/', {'supplier_id': self.supplier.pk, 'items': [{'product_id': self.product.pk, 'quantity': 10, 'unit_cost': '1200'}]}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.purchase = response.data

    def receive(self, quantity, key=None, cost='1200'):
        return self.client.post(f'/api/purchases/purchases/{self.purchase["id"]}/receive/', {'idempotency_key': str(key or uuid4()), 'lines': [{'item_id': self.purchase['items'][0]['id'], 'quantity': quantity, 'unit_cost': cost}]}, format='json')

    def test_partial_receipt_and_idempotency_do_not_double_stock(self):
        key = uuid4()
        response = self.receive(3, key)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'partial')
        self.assertEqual(response.data['items'][0]['received_quantity'], 3)
        self.assertEqual(self.receive(3, key).status_code, 200)
        self.assertEqual(self.receive(4, key).status_code, 409)
        self.product.refresh_from_db(); self.assertEqual(self.product.stock, 5)
        self.assertEqual(StockMovement.objects.filter(product=self.product).count(), 1)

    def test_over_receipt_is_rejected_and_full_receipt_finishes_purchase(self):
        self.assertEqual(self.receive(11).status_code, 400)
        self.assertEqual(self.receive(3).status_code, 200)
        self.assertEqual(self.receive(8).status_code, 400)
        result = self.receive(7)
        self.assertEqual(result.data['status'], 'confirmed')
        self.assertEqual(len(result.data['receipts']), 2)
        self.product.refresh_from_db(); self.assertEqual(self.product.stock, 12)

    def test_cancel_partial_returns_only_received_quantity(self):
        self.receive(3)
        response = self.client.post(f'/api/purchases/purchases/{self.purchase["id"]}/cancel/')
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db(); self.assertEqual(self.product.stock, 2)

    def test_actual_cost_is_preserved_in_receipt_and_weighted_inventory(self):
        response = self.receive(2, cost='1500.25')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['receipts'][0]['lines'][0]['unit_cost'], '1500.25')
        self.product.refresh_from_db(); self.assertEqual(self.product.cost_price, Decimal('1250.12'))

    def test_replenishment_uses_last_received_supplier(self):
        self.receive(1)
        result = self.client.get('/api/inventory/products/replenishment/')
        self.assertEqual(result.status_code, 200, result.data)
        row = next(row for row in result.data['results'] if row['id'] == self.product.pk)
        self.assertEqual(row['usual_supplier_id'], self.supplier.pk)

    def test_audit_records_price_change_but_never_authentication_fields(self):
        result = self.client.patch(f'/api/inventory/products/{self.product.pk}/', {'sale_price': '1600'}, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        result = self.client.get('/api/presales/audit/')
        self.assertEqual(result.status_code, 200)
        events = [row for row in result.data['results'] if row['entity'] == 'inventory.product']
        self.assertTrue(events)
        self.assertIn('sale_price', events[0]['detail']['changes'])
        self.assertNotIn('password', str(events))
