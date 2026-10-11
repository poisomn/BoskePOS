import json

from django.core.management import BaseCommand, CommandError
from django.db.models import Prefetch

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import INCREASE_TYPES, DECREASE_TYPES


class Command(BaseCommand):
    help = 'Comprueba continuidad del Kardex y saldo actual sin modificar datos. Ejecutar sin escrituras concurrentes.'

    def add_arguments(self, parser):
        parser.add_argument('--strict', action='store_true', help='Termina con error si existen diferencias.')

    def handle(self, *args, **options):
        issues = []
        count = 0
        products = Product.objects.order_by('pk').prefetch_related(Prefetch(
            'stock_movements', queryset=StockMovement.objects.order_by('created_at', 'pk')))
        for product in products.iterator(chunk_size=200):
            count += 1
            balance = 0
            for movement in product.stock_movements.all():
                if movement.stock_before != balance:
                    issues.append({'sku': product.sku, 'movement': movement.pk, 'issue': 'discontinuous_balance'})
                if movement.movement_type not in INCREASE_TYPES | DECREASE_TYPES:
                    issues.append({'sku': product.sku, 'movement': movement.pk, 'issue': 'invalid_type'})
                delta = movement.quantity if movement.movement_type in INCREASE_TYPES else -movement.quantity
                if movement.stock_after != movement.stock_before + delta or movement.quantity <= 0:
                    issues.append({'sku': product.sku, 'movement': movement.pk, 'issue': 'invalid_movement'})
                balance = movement.stock_after
            if balance != product.stock:
                issues.append({'sku': product.sku, 'issue': 'stock_mismatch', 'ledger': balance, 'stock': product.stock})
        self.stdout.write(json.dumps({'products_checked': count, 'issues': issues}, ensure_ascii=False))
        if issues and options['strict']:
            raise CommandError(f'Kardex con {len(issues)} diferencias. No se modificaron datos.')
