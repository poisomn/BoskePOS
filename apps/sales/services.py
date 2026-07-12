from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import StockMovementError, apply_stock_movement

from .models import Sale, SaleItem


class SaleConflict(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


def build_pos_cart_quote(items):
    if not items:
        return {
            'items': [],
            'subtotal': format_money(Decimal('0')),
            'total': format_money(Decimal('0')),
        }

    product_ids = [item['product_id'] for item in items]
    duplicate_ids = {product_id for product_id in product_ids if product_ids.count(product_id) > 1}
    if duplicate_ids:
        raise ValidationError({'items': 'A product can only appear once in the cart.'})

    products = {
        product.id: product
        for product in Product.objects.filter(id__in=product_ids, is_active=True)
    }

    missing_ids = [product_id for product_id in product_ids if product_id not in products]
    if missing_ids:
        raise ValidationError({'items': 'One or more products are unavailable.'})

    quote_items = []
    subtotal = Decimal('0')

    for item in items:
        product = products[item['product_id']]
        quantity = item['quantity']

        if quantity > product.stock:
            raise ValidationError(
                {'items': f'Insufficient stock for product {product.sku}.'}
            )

        line_subtotal = product.sale_price * quantity
        subtotal += line_subtotal
        quote_items.append(
            {
                'product_id': product.id,
                'name': product.name,
                'sku': product.sku,
                'barcode': product.barcode,
                'quantity': quantity,
                'unit_price': format_money(product.sale_price),
                'line_subtotal': format_money(line_subtotal),
                'available_stock': product.stock,
            }
        )

    return {
        'items': quote_items,
        'subtotal': format_money(subtotal),
        'total': format_money(subtotal),
    }


@transaction.atomic
def register_sale(*, user, customer=None, items):
    if not items:
        raise ValidationError({'items': 'La venta debe incluir al menos un producto.'})

    product_ids = [item['product_id'] for item in items]
    duplicate_ids = {product_id for product_id in product_ids if product_ids.count(product_id) > 1}
    if duplicate_ids:
        raise ValidationError({'items': 'Un producto solo puede aparecer una vez en la venta.'})

    products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(
            id__in=product_ids,
            is_active=True,
        ).order_by('id')
    }

    missing_ids = [product_id for product_id in product_ids if product_id not in products]
    if missing_ids:
        raise ValidationError({'items': 'Uno o mas productos no existen o estan inactivos.'})

    subtotal = Decimal('0')
    tax_total = Decimal('0')
    sale_items_data = []

    for item in items:
        product = products[item['product_id']]
        quantity = item['quantity']

        if quantity > product.stock:
            raise ValidationError(
                {'items': f'No hay stock suficiente para el producto {product.sku}.'}
            )

        line_subtotal = (product.sale_price * quantity).quantize(Decimal('0.01'))
        line_tax = Decimal('0.00')
        line_total = line_subtotal
        subtotal += line_total
        tax_total += line_tax
        sale_items_data.append(
            {
                'product': product,
                'product_name': product.name,
                'product_sku': product.sku,
                'quantity': quantity,
                'unit_price': product.sale_price,
                'discount_total': Decimal('0.00'),
                'tax_total': line_tax,
                'line_total': line_total,
            }
        )

    sale = Sale.objects.create(
        customer=customer,
        user=user,
        status=Sale.Status.COMPLETED,
        subtotal=subtotal,
        discount_total=Decimal('0.00'),
        tax_total=tax_total,
        total=subtotal,
        completed_at=timezone.now(),
    )

    SaleItem.objects.bulk_create(
        SaleItem(sale=sale, **item_data) for item_data in sale_items_data
    )

    for item_data in sale_items_data:
        apply_stock_movement(
            product=item_data['product'],
            movement_type=StockMovement.MovementType.EXIT,
            quantity=item_data['quantity'],
            reason=f'Venta #{sale.id} completada',
            user=user,
            reference=f'sale:{sale.id}',
        )

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def complete_sale(*, sale, user):
    sale = (
        Sale.objects.select_for_update()
        .prefetch_related('items__product')
        .get(pk=sale.pk)
    )

    if sale.status == Sale.Status.COMPLETED:
        raise SaleConflict('La venta ya esta completada.')
    if sale.status == Sale.Status.CANCELLED:
        raise SaleConflict('Una venta anulada no puede completarse.')

    items = list(sale.items.select_related('product').order_by('product_id'))
    if not items:
        raise ValidationError({'items': 'La venta debe incluir al menos un producto.'})

    for item in items:
        product = Product.objects.select_for_update().get(pk=item.product_id)
        if not product.is_active:
            raise ValidationError({'items': f'El producto {item.product_sku} no esta activo.'})
        if item.quantity > product.stock:
            raise ValidationError(
                {'items': f'No hay stock suficiente para el producto {item.product_sku}.'}
            )

    for item in items:
        apply_stock_movement(
            product=item.product,
            movement_type=StockMovement.MovementType.EXIT,
            quantity=item.quantity,
            reason=f'Venta #{sale.id} completada',
            user=user,
            reference=f'sale:{sale.id}',
        )

    sale.status = Sale.Status.COMPLETED
    sale.completed_at = timezone.now()
    sale.save(update_fields=('status', 'completed_at'))

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def cancel_sale(*, sale, user):
    sale = (
        Sale.objects.select_for_update()
        .prefetch_related('items__product')
        .get(pk=sale.pk)
    )

    if sale.status == Sale.Status.PENDING:
        raise SaleConflict('Una venta pendiente no requiere anulacion.')
    if sale.status == Sale.Status.CANCELLED:
        raise SaleConflict('La venta ya esta anulada.')

    for item in sale.items.select_related('product'):
        try:
            apply_stock_movement(
                product=item.product,
                movement_type=StockMovement.MovementType.ENTRY,
                quantity=item.quantity,
                reason=f'Anulacion de venta #{sale.id}',
                user=user,
                reference=f'sale-cancel:{sale.id}',
            )
        except StockMovementError as exc:
            raise SaleConflict(exc.message) from exc

    sale.status = Sale.Status.CANCELLED
    sale.cancelled_at = timezone.now()
    sale.save(update_fields=('status', 'cancelled_at'))

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


def format_money(value):
    return f'{value.quantize(Decimal("0.01"))}'
