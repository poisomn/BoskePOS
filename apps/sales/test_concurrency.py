from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test import TransactionTestCase
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product, StockMovement
from .models import Sale
from .services import SaleConflict, cancel_sale, register_sale


@skipUnless(connection.vendor == 'postgresql', 'Row locking must be verified against PostgreSQL.')
class SaleConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email='concurrency@example.test', password=None)
        from apps.cash.models import CashRegister, CashSession
        CashSession.objects.create(register=CashRegister.objects.create(name='Test till'), cashier=self.user, opening_amount=0)
        self.product = Product.objects.create(name='Last unit', sku='LAST', stock=1, sale_price='1190')

    def test_two_cashiers_cannot_sell_the_same_last_unit(self):
        barrier = Barrier(2)

        def sell():
            close_old_connections()
            try:
                user = get_user_model().objects.get(pk=self.user.pk)
                barrier.wait(timeout=10)
                try:
                    register_sale(user=user, items=[{'product_id': self.product.pk, 'quantity': 1}])
                    return 'sold'
                except ValidationError:
                    return 'no_stock'
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: sell(), range(2)))
        self.assertCountEqual(results, ['sold', 'no_stock'])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(StockMovement.objects.count(), 1)

    def test_simultaneous_cancellations_restore_stock_once(self):
        sale = register_sale(user=self.user, items=[{'product_id': self.product.pk, 'quantity': 1}])
        barrier = Barrier(2)

        def cancel():
            close_old_connections()
            try:
                user = get_user_model().objects.get(pk=self.user.pk)
                barrier.wait(timeout=10)
                try:
                    cancel_sale(sale=sale, user=user)
                    return 'cancelled'
                except SaleConflict:
                    return 'conflict'
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: cancel(), range(2)))
        self.assertCountEqual(results, ['cancelled', 'conflict'])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertEqual(StockMovement.objects.filter(reference=f'sale-cancel:{sale.pk}').count(), 1)
