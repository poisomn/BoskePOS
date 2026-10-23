from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import TransactionTestCase
from rest_framework.exceptions import APIException
from apps.cash.models import CashMovement, CashRegister, CashSession
from apps.inventory.models import Product
from .models import PresaleStation, PresaleTicket
from .presales import issue_ticket, pay_ticket, take_ticket


@skipUnless(connection.vendor == 'postgresql', 'Bloqueos de filas: requiere PostgreSQL.')
class PresaleConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.users = [get_user_model().objects.create_user(email=f'cash{i}@concurrency.test') for i in range(2)]
        self.station = PresaleStation.objects.create(name='Concurrente')
        self.product = Product.objects.create(name='Producto', sku='PC-1', stock=10, sale_price='1190')
        for i, user in enumerate(self.users):
            box = CashRegister.objects.create(name=f'Caja {i}')
            CashSession.objects.create(register=box, cashier=user, opening_amount=0)

    def ticket(self, quantity=1):
        return issue_ticket(user=self.users[0], station_id=self.station.pk, key=uuid4(), values={'items': [{'product_id': self.product.pk, 'quantity': quantity}]})

    def simultaneous(self, tasks):
        barrier = Barrier(len(tasks))
        def worker(task):
            connections.close_all()
            try:
                barrier.wait(timeout=10)
                task()
                return 'ok'
            except APIException as exc:
                return exc.status_code
            finally: connections.close_all()
        with ThreadPoolExecutor(max_workers=len(tasks)) as pool:
            return list(pool.map(worker, tasks))

    def test_only_one_cashier_can_take_the_same_ticket(self):
        ticket = self.ticket()
        result = self.simultaneous([lambda user=user: take_ticket(ticket.pk, user) for user in self.users])
        self.assertEqual(result.count('ok'), 1)
        self.assertEqual(result.count(409), 1)

    def test_two_tickets_cannot_oversell_the_same_stock(self):
        tickets = [self.ticket(6), self.ticket(6)]
        for ticket, user in zip(tickets, self.users): take_ticket(ticket.pk, user)
        tasks = [lambda ticket=ticket, user=user: pay_ticket(ticket.pk, user, {'payment_method': 'debit', 'idempotency_key': uuid4()}) for ticket, user in zip(tickets, self.users)]
        result = self.simultaneous(tasks)
        self.assertEqual(result.count('ok'), 1)
        self.assertEqual(result.count(400), 1)
        self.product.refresh_from_db(); self.assertEqual(self.product.stock, 4)
        self.assertEqual(CashMovement.objects.filter(kind='sale').count(), 1)
        self.assertEqual(PresaleTicket.objects.filter(status='paid').count(), 1)
