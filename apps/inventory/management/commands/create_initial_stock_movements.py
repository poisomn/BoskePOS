from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.inventory.models import Product, StockMovement


INITIAL_STOCK_REFERENCE = 'initial-stock-mvp-v0.1-r1'
INITIAL_STOCK_REASON = 'Saldo inicial MVP v0.1-R1'


class Command(BaseCommand):
    help = 'Crea movimientos iniciales idempotentes para productos con stock existente.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            required=True,
            help='Email del usuario responsable del saldo inicial.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        user_email = options['user_email']
        user_model = get_user_model()

        try:
            user = user_model.objects.get(email=user_email)
        except user_model.DoesNotExist as exc:
            raise CommandError(f'No existe un usuario con email {user_email}.') from exc

        products = Product.objects.select_for_update().filter(stock__gt=0).order_by('id')
        created_count = 0
        skipped_count = 0

        for product in products:
            exists = StockMovement.objects.filter(
                product=product,
                reference=INITIAL_STOCK_REFERENCE,
            ).exists()

            if exists:
                skipped_count += 1
                continue

            StockMovement.objects.create(
                product=product,
                movement_type=StockMovement.MovementType.POSITIVE_ADJUSTMENT,
                quantity=product.stock,
                reason=INITIAL_STOCK_REASON,
                user=user,
                stock_before=0,
                stock_after=product.stock,
                reference=INITIAL_STOCK_REFERENCE,
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Movimientos iniciales creados: {created_count}. Omitidos: {skipped_count}.'
            )
        )
