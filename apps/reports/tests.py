from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase
from apps.cash.models import CashRegister, CashSession
from apps.inventory.models import Product
from apps.sales.models import Sale, SaleItem
from apps.sales.services import register_sale


class OperationalReportTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_roles', verbosity=0)
        cls.admin = get_user_model().objects.create_superuser(email='report@case.test')
        cls.seller = get_user_model().objects.create_user(email='report-seller@case.test')
        cls.seller.groups.add(Group.objects.get(name='vendedor'))
        CashSession.objects.create(register=CashRegister.objects.create(name='Reports'), cashier=cls.admin, opening_amount=0)
        cls.product = Product.objects.create(name='Report product', sku='REPORT', stock=5, sale_price='1190', cost_price='500')

    def test_profit_uses_historical_cost_and_counts_clients_separately(self):
        self.client.force_authenticate(self.admin)
        register_sale(user=self.admin, items=[{'product_id': self.product.pk, 'quantity': 1}])
        self.product.cost_price = Decimal('900')
        self.product.save(update_fields=('cost_price',))
        response = self.client.get('/api/reports/operations/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['profitability']['gross_profit'], '500.00')
        self.assertEqual(response.data['identified_customers'], 0)
        self.assertEqual(response.data['anonymous_transactions'], 1)
        self.assertEqual(response.data['warehouse']['cost_value'], '3600.00')

    def test_missing_historical_cost_marks_profit_unavailable(self):
        self.client.force_authenticate(self.admin)
        sale = Sale.objects.create(user=self.admin, subtotal=1190, total=1190, tax_total=190, completed_at=timezone.now())
        SaleItem.objects.create(sale=sale, product=self.product, product_name='Historical', product_sku='REPORT', quantity=1, unit_price=1190, line_total=1190)
        result = self.client.get('/api/reports/operations/').data
        self.assertIsNone(result['profitability']['gross_profit'])
        self.assertEqual(result['profitability']['missing_cost_lines'], 1)
        self.assertEqual(result['cashiers'][0]['cashier'], 'Cajero histórico no registrado')

    def test_seller_cannot_obtain_costs_or_warehouse_values(self):
        self.client.force_authenticate(self.seller)
        result = self.client.get('/api/reports/operations/')
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('profitability', result.data)
        self.assertNotIn('warehouse', result.data)
        self.assertIsNone(result.data['average_ticket'])

    def test_invalid_range_is_rejected(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get('/api/reports/operations/', {'date_from': '2020-01-01', 'date_to': '2026-01-01'}).status_code, 400)
