from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product
from apps.sales.models import Sale
from apps.sales.services import register_sale
from .models import CashRegister, CashSession, CashMovement
from .services import open_session, close_session, session_summary


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locking.')
class CashConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.users = [get_user_model().objects.create_user(email=f'cashier{i}@race.test') for i in range(2)]
        self.registers = [CashRegister.objects.create(name=f'Caja {i}') for i in range(2)]
        self.product = Product.objects.create(name='Última unidad', sku='LAST-RACE', stock=1, sale_price='1190')

    def parallel(self, function):
        barrier = Barrier(2)
        def work(index):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return function(index)
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(work, range(2)))

    def test_two_real_cashiers_cannot_sell_last_unit(self):
        for user, register in zip(self.users, self.registers):
            open_session(user=user, register_id=register.pk, opening_amount=0)
        def sell(index):
            try:
                register_sale(user=self.users[index], items=[{'product_id': self.product.pk, 'quantity': 1}])
                return 'sold'
            except ValidationError:
                return 'unavailable'
        self.assertCountEqual(self.parallel(sell), ['sold', 'unavailable'])
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(CashMovement.objects.count(), 1)

    def test_two_cashiers_cannot_open_same_register(self):
        def open_till(index):
            try:
                open_session(user=self.users[index], register_id=self.registers[0].pk, opening_amount=0)
                return 'opened'
            except ValidationError:
                return 'conflict'
        self.assertCountEqual(self.parallel(open_till), ['opened', 'conflict'])
        self.assertEqual(CashSession.objects.count(), 1)

    def test_same_idempotency_key_concurrently_produces_one_charge(self):
        open_session(user=self.users[0], register_id=self.registers[0].pk, opening_amount=0)
        key = uuid4()
        def sell(index):
            return register_sale(user=self.users[0], items=[{'product_id': self.product.pk, 'quantity': 1}], idempotency_key=key).pk
        results = self.parallel(sell)
        self.assertEqual(results[0], results[1])
        self.assertEqual(CashMovement.objects.count(), 1)

    def test_close_and_sale_cannot_leave_a_late_movement(self):
        user = self.users[0]
        session = open_session(user=user, register_id=self.registers[0].pk, opening_amount=0)
        def mutate(index):
            if index == 0:
                close_session(user=user, session=session, counted={'cash': 0, 'debit': 0, 'credit': 0, 'transfer': 0}, notes='Conteo de prueba concurrente', authorizer=user)
                return 'closed'
            try:
                register_sale(user=user, items=[{'product_id': self.product.pk, 'quantity': 1}])
                return 'sold'
            except ValidationError:
                return 'blocked'
        result = self.parallel(mutate)
        self.assertIn('closed', result)
        session.refresh_from_db()
        for movement in session.movements.all():
            self.assertLessEqual(movement.created_at, session.closed_at)
        expected = '1190.00' if 'sold' in result else '0.00'
        self.assertEqual(session_summary(session)['expected']['cash'], expected)
