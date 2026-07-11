from dataclasses import dataclass

from django.db import transaction

from .models import Product, StockMovement


class StockMovementError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


@dataclass(frozen=True)
class StockMovementResult:
    movement: StockMovement
    product: Product


INCREASE_TYPES = {
    StockMovement.MovementType.ENTRY,
    StockMovement.MovementType.POSITIVE_ADJUSTMENT,
}

DECREASE_TYPES = {
    StockMovement.MovementType.EXIT,
    StockMovement.MovementType.NEGATIVE_ADJUSTMENT,
}


def apply_stock_movement(*, product, movement_type, quantity, reason, user, reference=''):
    if quantity <= 0:
        raise StockMovementError('La cantidad debe ser mayor que cero.', field='quantity')

    reason = reason.strip()
    if not reason:
        raise StockMovementError('El motivo es obligatorio.', field='reason')

    if not user or not user.is_authenticated:
        raise StockMovementError('El usuario responsable es obligatorio.', field='user')

    if movement_type not in StockMovement.MovementType.values:
        raise StockMovementError('Tipo de movimiento invalido.', field='movement_type')

    with transaction.atomic():
        locked_product = Product.objects.select_for_update().get(pk=product.pk)
        stock_before = locked_product.stock

        if movement_type in INCREASE_TYPES:
            stock_after = stock_before + quantity
        elif movement_type in DECREASE_TYPES:
            stock_after = stock_before - quantity
        else:
            raise StockMovementError('Tipo de movimiento invalido.', field='movement_type')

        if stock_after < 0:
            raise StockMovementError(
                'No hay stock suficiente para completar el movimiento.',
                field='quantity',
            )

        movement = StockMovement.objects.create(
            product=locked_product,
            movement_type=movement_type,
            quantity=quantity,
            reason=reason,
            user=user,
            stock_before=stock_before,
            stock_after=stock_after,
            reference=reference.strip(),
        )

        locked_product.stock = stock_after
        locked_product.save(update_fields=('stock', 'updated_at'))

    return StockMovementResult(movement=movement, product=locked_product)
