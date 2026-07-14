from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.permissions import ADMIN_ROLE, INVENTORY_ROLE, SELLER_ROLE
from apps.customers.models import Customer
from apps.inventory.models import Product, StockMovement
from apps.purchases.models import Purchase
from apps.sales.models import Sale, SaleItem
from apps.suppliers.models import Supplier


class DashboardSummaryApiTests(APITestCase):
    def setUp(self):
        call_command('seed_roles', verbosity=0)
        self.admin = get_user_model().objects.create_user(
            email='dashboard-admin@boskepos.cl',
            password='strong-test-password',
        )
        self.admin.groups.add(Group.objects.get(name=ADMIN_ROLE))
        self.seller = get_user_model().objects.create_user(
            email='dashboard-seller@boskepos.cl',
            password='strong-test-password',
        )
        self.seller.groups.add(Group.objects.get(name=SELLER_ROLE))
        self.inventory_user = get_user_model().objects.create_user(
            email='dashboard-inventory@boskepos.cl',
            password='strong-test-password',
        )
        self.inventory_user.groups.add(Group.objects.get(name=INVENTORY_ROLE))
        self.no_role_user = get_user_model().objects.create_user(
            email='dashboard-empty@boskepos.cl',
            password='strong-test-password',
        )

        self.customer = Customer.objects.create(name='Cliente Dashboard')
        self.supplier = Supplier.objects.create(name='Proveedor Dashboard')
        self.low_stock_product = Product.objects.create(
            name='Producto bajo stock',
            sku='DASH-LOW',
            sale_price='1000.00',
            stock=2,
            minimum_stock=3,
        )
        self.out_of_stock_product = Product.objects.create(
            name='Producto sin stock',
            sku='DASH-ZERO',
            sale_price='2000.00',
            stock=0,
            minimum_stock=1,
        )
        self.normal_product = Product.objects.create(
            name='Producto normal',
            sku='DASH-OK',
            sale_price='3000.00',
            stock=10,
            minimum_stock=2,
        )

        self.today = timezone.localdate()
        self.today_start = timezone.make_aware(
            timezone.datetime.combine(self.today, timezone.datetime.min.time()),
            timezone.get_current_timezone(),
        )

    def test_summary_calculates_sales_and_excludes_pending_and_cancelled(self):
        completed = Sale.objects.create(
            customer=self.customer,
            user=self.seller,
            status=Sale.Status.COMPLETED,
            subtotal='10000.00',
            total='10000.00',
        )
        pending = Sale.objects.create(
            user=self.seller,
            status=Sale.Status.PENDING,
            subtotal='5000.00',
            total='5000.00',
        )
        cancelled = Sale.objects.create(
            user=self.seller,
            status=Sale.Status.CANCELLED,
            subtotal='3000.00',
            total='3000.00',
        )
        old_completed = Sale.objects.create(
            user=self.seller,
            status=Sale.Status.COMPLETED,
            subtotal='7000.00',
            total='7000.00',
        )
        Sale.objects.filter(id=old_completed.id).update(
            created_at=self.today_start - timedelta(days=1),
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard:summary'), {'date': self.today.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sales']['total'], '10000.00')
        self.assertEqual(response.data['sales']['count'], 1)
        self.assertEqual(len(response.data['sales']['daily']), 1)
        self.assertEqual(response.data['sales']['daily'][0]['date'], self.today.isoformat())
        self.assertEqual(response.data['sales']['daily'][0]['total'], '10000.00')
        self.assertEqual(response.data['sales']['daily'][0]['count'], 1)
        recent_ids = {sale['id'] for sale in response.data['sales']['recent']}
        self.assertIn(completed.id, recent_ids)
        self.assertIn(pending.id, recent_ids)
        self.assertIn(cancelled.id, recent_ids)

    def test_summary_calculates_stock_indicators(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['inventory']['active_count'], 3)
        self.assertEqual(response.data['inventory']['healthy_stock_count'], 1)
        self.assertEqual(response.data['inventory']['low_stock_count'], 1)
        self.assertEqual(response.data['inventory']['alert_stock_count'], 1)
        self.assertEqual(response.data['inventory']['out_of_stock_count'], 1)
        low_stock_skus = {
            product['sku'] for product in response.data['inventory']['low_stock_products']
        }
        self.assertIn(self.low_stock_product.sku, low_stock_skus)
        self.assertNotIn(self.out_of_stock_product.sku, low_stock_skus)

    def test_summary_includes_recent_purchases_and_stock_movements(self):
        purchase = Purchase.objects.create(
            supplier=self.supplier,
            user=self.inventory_user,
            status=Purchase.Status.CONFIRMED,
            subtotal='12000.00',
            total='12000.00',
        )
        movement = StockMovement.objects.create(
            product=self.normal_product,
            movement_type=StockMovement.MovementType.ENTRY,
            quantity=3,
            reason='Dashboard',
            user=self.inventory_user,
            stock_before=7,
            stock_after=10,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard:summary'), {'limit': 3})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['purchases']['recent'][0]['id'], purchase.id)
        self.assertEqual(response.data['stock_movements']['recent'][0]['id'], movement.id)

    def test_summary_without_data_returns_zero_and_empty_lists(self):
        Sale.objects.all().delete()
        Purchase.objects.all().delete()
        StockMovement.objects.all().delete()
        Product.objects.all().delete()

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sales']['total'], '0.00')
        self.assertEqual(response.data['sales']['count'], 0)
        self.assertEqual(response.data['sales']['recent'], [])
        self.assertEqual(response.data['inventory']['low_stock_count'], 0)
        self.assertEqual(response.data['inventory']['out_of_stock_count'], 0)

    def test_summary_includes_daily_series_for_range_and_top_products(self):
        sale_today = Sale.objects.create(
            customer=self.customer,
            user=self.seller,
            status=Sale.Status.COMPLETED,
            subtotal='10000.00',
            total='10000.00',
        )
        sale_yesterday = Sale.objects.create(
            customer=self.customer,
            user=self.seller,
            status=Sale.Status.COMPLETED,
            subtotal='8000.00',
            total='8000.00',
        )
        Sale.objects.filter(id=sale_yesterday.id).update(
            created_at=self.today_start - timedelta(days=1),
        )
        SaleItem.objects.create(
            sale=sale_today,
            product=self.normal_product,
            product_name=self.normal_product.name,
            product_sku=self.normal_product.sku,
            quantity=2,
            unit_price='5000.00',
            line_total='10000.00',
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            reverse('dashboard:summary'),
            {
                'date_from': (self.today - timedelta(days=2)).isoformat(),
                'date_to': self.today.isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['sales']['daily']), 3)
        self.assertEqual(response.data['sales']['daily'][0]['total'], '0.00')
        self.assertEqual(response.data['sales']['daily'][1]['total'], '8000.00')
        self.assertEqual(response.data['sales']['daily'][2]['total'], '10000.00')
        self.assertEqual(response.data['sales']['top_products'][0]['id'], self.normal_product.id)
        self.assertEqual(response.data['sales']['top_products'][0]['quantity'], 2)

    def test_summary_restricts_sections_by_role(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('sales', response.data)
        self.assertNotIn('purchases', response.data)
        self.assertIn('inventory', response.data)
        self.assertNotIn('stock_movements', response.data)

    def test_summary_requires_authenticated_user(self):
        response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_summary_rejects_user_without_dashboard_sections(self):
        self.client.force_authenticate(user=self.no_role_user)

        response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_summary_rejects_invalid_dates_and_large_ranges(self):
        self.client.force_authenticate(user=self.admin)

        invalid_response = self.client.get(reverse('dashboard:summary'), {'date': 'invalid'})
        range_response = self.client.get(
            reverse('dashboard:summary'),
            {
                'date_from': self.today.isoformat(),
                'date_to': (self.today + timedelta(days=40)).isoformat(),
            },
        )

        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(range_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_summary_uses_reasonable_number_of_queries(self):
        Purchase.objects.create(
            supplier=self.supplier,
            user=self.inventory_user,
            status=Purchase.Status.CONFIRMED,
            subtotal='12000.00',
            total='12000.00',
        )
        StockMovement.objects.create(
            product=self.normal_product,
            movement_type=StockMovement.MovementType.ENTRY,
            quantity=3,
            reason='Dashboard',
            user=self.inventory_user,
            stock_before=7,
            stock_after=10,
        )
        self.client.force_authenticate(user=self.admin)

        with CaptureQueriesContext(connection) as context:
            response = self.client.get(reverse('dashboard:summary'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(context), 12)
