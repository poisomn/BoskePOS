from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.inventory.models import Product, StockMovement
from .models import OperationEvent


class AuditProductTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(email='audit-products@test.local')
        self.client.force_authenticate(self.user)
        self.product = Product.objects.create(name='Tornillo zincado', sku='TOR-25', sale_price='1500', stock=10)

    def test_movement_identifies_product_and_preserves_stock_context(self):
        response = self.client.post(f'/api/inventory/products/{self.product.pk}/adjust-stock/',
            {'movement_type': 'exit', 'quantity': 3, 'reason': 'Entrega de mostrador', 'reference': 'PED-100'}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        event = OperationEvent.objects.get(action='stock_moved')
        self.assertEqual(event.detail['products'][0]['sku'], 'TOR-25')
        self.assertEqual(event.detail['products'][0]['name'], 'Tornillo zincado')
        self.assertEqual(event.detail['stock_before'], 10)
        self.assertEqual(event.detail['stock_after'], 7)
        self.assertEqual(event.detail['quantity'], 3)
        self.assertEqual(event.detail['reference'], 'PED-100')
        result = self.client.get('/api/presales/audit/', {'search': 'TOR-25'})
        self.assertEqual(result.status_code, 200, result.data)
        self.assertTrue(any(row['action'] == 'stock_moved' for row in result.data['results']))

    def test_previous_events_resolve_product_identity_without_rewriting_history(self):
        event = OperationEvent.objects.create(actor=self.user, entity='inventory.product', entity_id=str(self.product.pk), action='updated', detail={'changes': {'stock': {'before': '12', 'after': '10'}}})
        result = self.client.get(f'/api/presales/audit/{event.pk}/')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['products'][0]['name'], self.product.name)
        event.refresh_from_db()
        self.assertNotIn('products', event.detail)

    def test_identity_snapshot_survives_product_rename(self):
        self.client.patch(f'/api/inventory/products/{self.product.pk}/', {'sale_price': '1600'}, format='json')
        event = OperationEvent.objects.filter(entity='inventory.product').first()
        Product.objects.filter(pk=self.product.pk).update(name='Otro nombre', sku='NEW-25')
        result = self.client.get(f'/api/presales/audit/{event.pk}/')
        self.assertEqual(result.data['products'][0]['name'], 'Tornillo zincado')
        self.assertEqual(result.data['products'][0]['sku'], 'TOR-25')

    def test_rejected_movement_leaves_no_movement_or_audit_record(self):
        response = self.client.post(f'/api/inventory/products/{self.product.pk}/adjust-stock/', {'movement_type': 'exit', 'quantity': 99, 'reason': 'Prueba'}, format='json')
        self.assertEqual(response.status_code, 409, response.data)
        self.assertFalse(StockMovement.objects.exists())
        self.assertFalse(OperationEvent.objects.filter(action='stock_moved').exists())

    def test_unprivileged_user_cannot_read_product_audit(self):
        self.client.force_authenticate(get_user_model().objects.create_user(email='no-audit@test.local'))
        self.assertEqual(self.client.get('/api/presales/audit/').status_code, 403)
