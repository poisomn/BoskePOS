from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import StockMovementError, apply_stock_movement
from apps.suppliers.models import Supplier

from .models import Purchase, PurchaseItem


class PurchaseConflict(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


def calculate_purchase_totals(items):
    subtotal = Decimal('0')
    calculated_items = []

    for item in items:
        quantity = item['quantity']
        unit_cost = item['unit_cost']
        line_total = (unit_cost * quantity).quantize(Decimal('0.01'))
        subtotal += line_total
        calculated_items.append({**item, 'line_total': line_total})

    total = subtotal.quantize(Decimal('0.01'))
    return calculated_items, total, total


@transaction.atomic
def save_purchase_draft(*, user, supplier, items, reference='', notes='', purchase=None):
    if not supplier.is_active:
        raise ValidationError({'supplier_id': 'El proveedor no esta activo.'})

    if not items:
        raise ValidationError({'items': 'La compra debe incluir al menos una linea.'})

    if purchase and purchase.status != Purchase.Status.DRAFT:
        raise PurchaseConflict('Solo se pueden editar compras en borrador.')

    prepared_items = _prepare_items(items)
    calculated_items, subtotal, total = calculate_purchase_totals(prepared_items)

    if purchase is None:
        purchase = Purchase.objects.create(
            supplier=supplier,
            user=user,
            reference=reference.strip(),
            notes=notes.strip(),
            subtotal=subtotal,
            total=total,
        )
    else:
        purchase.supplier = supplier
        purchase.reference = reference.strip()
        purchase.notes = notes.strip()
        purchase.subtotal = subtotal
        purchase.total = total
        purchase.save(
            update_fields=(
                'supplier',
                'reference',
                'notes',
                'subtotal',
                'total',
                'updated_at',
            )
        )
        purchase.items.all().delete()

    PurchaseItem.objects.bulk_create(
        PurchaseItem(
            purchase=purchase,
            product=item['product'],
            product_name=item['product'].name,
            product_sku=item['product'].sku,
            quantity=item['quantity'],
            unit_cost=item['unit_cost'],
            line_total=item['line_total'],
        )
        for item in calculated_items
    )

    return get_purchase_for_detail(purchase.pk)


@transaction.atomic
def confirm_purchase(*, purchase, user):
    purchase = (
        Purchase.objects.select_for_update()
        .select_related('supplier', 'user')
        .prefetch_related('items__product')
        .get(pk=purchase.pk)
    )

    if purchase.status == Purchase.Status.CONFIRMED:
        raise PurchaseConflict('La compra ya esta confirmada.')
    if purchase.status == Purchase.Status.CANCELLED:
        raise PurchaseConflict('Una compra anulada no puede confirmarse.')

    items = list(purchase.items.select_related('product'))
    if not items:
        raise ValidationError({'items': 'La compra debe incluir al menos una linea.'})

    _validate_supplier(purchase.supplier)
    _recalculate_persisted_purchase(purchase, items)

    for item in items:
        if not item.product.is_active:
            raise ValidationError({'items': f'El producto {item.product_sku} no esta activo.'})

        apply_stock_movement(
            product=item.product,
            movement_type=StockMovement.MovementType.ENTRY,
            quantity=item.quantity,
            reason=f'Compra #{purchase.id} confirmada',
            user=user,
            reference=f'purchase:{purchase.id}',
        )

    purchase.status = Purchase.Status.CONFIRMED
    purchase.confirmed_at = timezone.now()
    purchase.save(update_fields=('status', 'confirmed_at', 'subtotal', 'total', 'updated_at'))

    return get_purchase_for_detail(purchase.pk)


@transaction.atomic
def cancel_purchase(*, purchase, user):
    purchase = (
        Purchase.objects.select_for_update()
        .select_related('supplier', 'user')
        .prefetch_related('items__product')
        .get(pk=purchase.pk)
    )

    if purchase.status == Purchase.Status.DRAFT:
        raise PurchaseConflict('Una compra en borrador no requiere anulacion.')
    if purchase.status == Purchase.Status.CANCELLED:
        raise PurchaseConflict('La compra ya esta anulada.')

    items = list(purchase.items.select_related('product'))

    for item in items:
        try:
            apply_stock_movement(
                product=item.product,
                movement_type=StockMovement.MovementType.EXIT,
                quantity=item.quantity,
                reason=f'Anulacion de compra #{purchase.id}',
                user=user,
                reference=f'purchase-cancel:{purchase.id}',
            )
        except StockMovementError as exc:
            raise PurchaseConflict(exc.message) from exc

    purchase.status = Purchase.Status.CANCELLED
    purchase.cancelled_at = timezone.now()
    purchase.save(update_fields=('status', 'cancelled_at', 'updated_at'))

    return get_purchase_for_detail(purchase.pk)


def get_purchase_for_detail(pk):
    return (
        Purchase.objects.select_related('supplier', 'user')
        .prefetch_related('items__product')
        .get(pk=pk)
    )


def _prepare_items(items):
    product_ids = [item['product_id'] for item in items]
    duplicate_ids = {product_id for product_id in product_ids if product_ids.count(product_id) > 1}
    if duplicate_ids:
        raise ValidationError({'items': 'Un producto solo puede aparecer una vez en la compra.'})

    products = {
        product.id: product
        for product in Product.objects.filter(id__in=product_ids, is_active=True)
    }

    missing_ids = [product_id for product_id in product_ids if product_id not in products]
    if missing_ids:
        raise ValidationError({'items': 'Uno o mas productos no existen o estan inactivos.'})

    prepared_items = []
    for item in items:
        prepared_items.append(
            {
                'product': products[item['product_id']],
                'quantity': item['quantity'],
                'unit_cost': item['unit_cost'],
            }
        )
    return prepared_items


def _validate_supplier(supplier):
    if not Supplier.objects.filter(pk=supplier.pk, is_active=True).exists():
        raise ValidationError({'supplier_id': 'El proveedor no existe o esta inactivo.'})


def _recalculate_persisted_purchase(purchase, items):
    total = Decimal('0')
    for item in items:
        expected_total = (item.unit_cost * item.quantity).quantize(Decimal('0.01'))
        if item.line_total != expected_total:
            item.line_total = expected_total
            item.save(update_fields=('line_total',))
        total += expected_total

    purchase.subtotal = total.quantize(Decimal('0.01'))
    purchase.total = total.quantize(Decimal('0.01'))
