from decimal import Decimal
from types import SimpleNamespace
import hashlib
import json

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import StockMovementError, apply_stock_movement
from apps.suppliers.models import Supplier
from apps.utils.money import validate_money_capacity

from .models import Purchase, PurchaseItem, PurchaseReceipt


@transaction.atomic
def receive_purchase(*, purchase, user, lines, key, notes=''):
    purchase = Purchase.objects.select_for_update().select_related('supplier').get(pk=purchase.pk)
    fingerprint = hashlib.sha256(json.dumps({'lines': lines, 'notes': notes}, sort_keys=True, default=str).encode()).hexdigest()
    previous = PurchaseReceipt.objects.filter(purchase=purchase, key=key).first()
    if previous:
        if previous.fingerprint != fingerprint: raise PurchaseConflict('La clave ya se usó para otra recepción.')
        return get_purchase_for_detail(purchase.pk)
    if purchase.status not in ('draft', 'partial'): raise PurchaseConflict('Esta compra ya fue recibida o anulada.')
    _validate_supplier(purchase.supplier)
    rows = {line.pk: line for line in purchase.items.all()}
    ids = [line['item_id'] for line in lines]
    if not lines or len(ids) != len(set(ids)) or any(pk not in rows for pk in ids):
        raise ValidationError({'lines': 'Selecciona líneas válidas, sin repetir, de esta compra.'})
    products = {p.pk: p for p in Product.objects.select_for_update().filter(pk__in=[rows[pk].product_id for pk in ids]).order_by('pk')}
    for incoming in lines:
        line = rows[incoming['item_id']]
        quantity = incoming['quantity']
        product = products[line.product_id]
        if quantity <= 0 or line.received_quantity + quantity > line.quantity:
            raise ValidationError({'lines': f'La recepción supera lo pendiente de {line.product_name}.'})
        if not product.is_active: raise ValidationError({'lines': f'Producto inactivo: {line.product_name}.'})
        cost = incoming.get('unit_cost', line.unit_cost)
        _update_weighted_average_cost(product=product, item=SimpleNamespace(quantity=quantity, unit_cost=cost))
        apply_stock_movement(product=product, movement_type=StockMovement.MovementType.ENTRY, quantity=quantity,
                             user=user, reason=f'Recepción de compra #{purchase.pk}', reference=f'purchase:{purchase.pk}')
        line.received_quantity += quantity
        line.save(update_fields=('received_quantity',))
    PurchaseReceipt.objects.create(purchase=purchase, user=user, key=key, fingerprint=fingerprint,
                                    lines=json.loads(json.dumps(lines, default=str)), notes=notes)
    purchase.status = 'confirmed' if all(row.received_quantity == row.quantity for row in rows.values()) else 'partial'
    purchase.confirmed_at = timezone.now() if purchase.status == 'confirmed' else None
    purchase.save(update_fields=('status', 'confirmed_at', 'updated_at'))
    from apps.sales.presales import audit
    audit(user, 'purchases.purchase', purchase.pk, 'received', lines=json.loads(json.dumps(lines, default=str)), notes=notes)
    return get_purchase_for_detail(purchase.pk)


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
        validate_money_capacity(subtotal)
        calculated_items.append({**item, 'line_total': line_total})

    total = subtotal.quantize(Decimal('0.01'))
    return calculated_items, total, total


@transaction.atomic
def save_purchase_draft(*, user, supplier, items, reference='', notes='', purchase=None):
    if purchase is not None:
        purchase = Purchase.objects.select_for_update().get(pk=purchase.pk)
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
    from uuid import uuid4
    purchase = Purchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status not in ('draft', 'partial'):
        raise PurchaseConflict('La compra ya está confirmada o anulada.')
    lines = [{'item_id': line.pk, 'quantity': line.quantity-line.received_quantity, 'unit_cost': line.unit_cost}
             for line in purchase.items.all() if line.received_quantity < line.quantity]
    return receive_purchase(purchase=purchase, user=user, lines=lines, key=uuid4())


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

    items = list(purchase.items.select_related('product').order_by('product_id'))

    for item in items:
        if not item.received_quantity:
            continue
        try:
            apply_stock_movement(
                product=item.product,
                movement_type=StockMovement.MovementType.EXIT,
                quantity=item.received_quantity,
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


@transaction.atomic
def discard_purchase_draft(*, purchase):
    purchase = Purchase.objects.select_for_update().get(pk=purchase.pk)
    if purchase.status != Purchase.Status.DRAFT:
        raise PurchaseConflict('No se pueden eliminar compras confirmadas o anuladas.')
    purchase.delete()


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


def _update_weighted_average_cost(*, product, item):
    current_stock = Decimal(product.stock)
    incoming_quantity = Decimal(item.quantity)

    if incoming_quantity <= 0:
        return

    if current_stock <= 0:
        product.cost_price = item.unit_cost.quantize(Decimal('0.01'))
    else:
        current_value = product.cost_price * current_stock
        incoming_value = item.unit_cost * incoming_quantity
        product.cost_price = (
            (current_value + incoming_value) / (current_stock + incoming_quantity)
        ).quantize(Decimal('0.01'))

    product.save(update_fields=('cost_price', 'updated_at'))
