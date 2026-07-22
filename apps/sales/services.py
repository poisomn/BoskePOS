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
            'discount_total': format_money(Decimal('0')),
            'tax_total': format_money(Decimal('0')),
            'total': format_money(Decimal('0')),
        }

    products = _get_active_products(items)
    _validate_available_stock(items, products)
    totals = _build_sale_lines(items, products)

    return {
        'items': totals['quote_items'],
        'subtotal': format_money(totals['subtotal']),
        'discount_total': format_money(totals['discount_total']),
        'tax_total': format_money(totals['tax_total']),
        'total': format_money(totals['total']),
    }


@transaction.atomic
def register_sale(
    *,
    user,
    customer=None,
    items,
    status=Sale.Status.COMPLETED,
    payment_method=Sale.PaymentMethod.CASH,
    amount_paid=None,
    notes='',
):
    if not items:
        raise ValidationError({'items': 'La venta debe incluir al menos un producto.'})

    if status not in {Sale.Status.PENDING, Sale.Status.COMPLETED}:
        raise ValidationError({'status': 'Estado de venta no permitido para POS.'})

    products = _get_active_products(items, lock=status == Sale.Status.COMPLETED)
    _validate_available_stock(items, products)
    totals = _build_sale_lines(items, products)
    payment = _build_payment(
        status=status,
        total=totals['total'],
        payment_method=payment_method,
        amount_paid=amount_paid,
    )

    sale = Sale.objects.create(
        customer=customer,
        user=user,
        status=status,
        subtotal=totals['subtotal'],
        discount_total=totals['discount_total'],
        tax_total=totals['tax_total'],
        total=totals['total'],
        payment_method=payment['payment_method'],
        amount_paid=payment['amount_paid'],
        change_amount=payment['change_amount'],
        notes=(notes or '').strip(),
        completed_at=timezone.now() if status == Sale.Status.COMPLETED else None,
    )

    SaleItem.objects.bulk_create(
        SaleItem(sale=sale, **item_data) for item_data in totals['sale_items_data']
    )

    if status == Sale.Status.COMPLETED:
        _apply_sale_stock_exit(sale=sale, items_data=totals['sale_items_data'], user=user)

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def update_pending_sale(
    *,
    sale,
    user,
    customer=None,
    items,
    payment_method=Sale.PaymentMethod.CASH,
    amount_paid=None,
    notes='',
):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)

    if sale.status != Sale.Status.PENDING:
        raise SaleConflict('Solo se puede editar una venta pendiente.')

    products = _get_active_products(items)
    _validate_available_stock(items, products)
    totals = _build_sale_lines(items, products)
    payment = _build_payment(
        status=Sale.Status.PENDING,
        total=totals['total'],
        payment_method=payment_method,
        amount_paid=amount_paid,
    )

    sale.customer = customer
    sale.user = user
    sale.subtotal = totals['subtotal']
    sale.discount_total = totals['discount_total']
    sale.tax_total = totals['tax_total']
    sale.total = totals['total']
    sale.payment_method = payment['payment_method']
    sale.amount_paid = payment['amount_paid']
    sale.change_amount = payment['change_amount']
    sale.notes = (notes or '').strip()
    sale.save(
        update_fields=(
            'customer',
            'user',
            'subtotal',
            'discount_total',
            'tax_total',
            'total',
            'payment_method',
            'amount_paid',
            'change_amount',
            'notes',
        )
    )
    sale.items.all().delete()
    SaleItem.objects.bulk_create(
        SaleItem(sale=sale, **item_data) for item_data in totals['sale_items_data']
    )

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def complete_sale(
    *,
    sale,
    user,
    payment_method=Sale.PaymentMethod.CASH,
    amount_paid=None,
    notes=None,
):
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

    product_ids = sorted({item.product_id for item in items})
    locked_products = {
        product.id: product
        for product in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')
    }
    quantities_by_product = {}
    for item in items:
        product = locked_products[item.product_id]
        quantities_by_product[item.product_id] = (
            quantities_by_product.get(item.product_id, 0) + item.quantity
        )
        if not product.is_active:
            raise ValidationError({'items': f'El producto {item.product_sku} no esta activo.'})

    for product_id, requested_quantity in quantities_by_product.items():
        product = locked_products[product_id]
        if requested_quantity > product.stock:
            raise ValidationError(
                {'items': f'No hay stock suficiente para el producto {product.sku}.'}
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

    payment = _build_payment(
        status=Sale.Status.COMPLETED,
        total=sale.total,
        payment_method=payment_method,
        amount_paid=amount_paid,
    )
    sale.status = Sale.Status.COMPLETED
    sale.completed_at = timezone.now()
    sale.payment_method = payment['payment_method']
    sale.amount_paid = payment['amount_paid']
    sale.change_amount = payment['change_amount']
    if notes is not None:
        sale.notes = (notes or '').strip()
    sale.save(
        update_fields=(
            'status',
            'completed_at',
            'payment_method',
            'amount_paid',
            'change_amount',
            'notes',
        )
    )

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


@transaction.atomic
def discard_pending_sale(*, sale):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)

    if sale.status != Sale.Status.PENDING:
        raise SaleConflict('Solo se pueden eliminar ventas suspendidas.')

    sale.delete()


def format_money(value):
    return f'{value.quantize(Decimal("0.01"))}'


def _get_active_products(items, *, lock=False):
    product_ids = sorted({item['product_id'] for item in items})
    queryset = Product.objects.filter(id__in=product_ids, is_active=True).order_by('id')
    if lock:
        queryset = queryset.select_for_update()

    products = {product.id: product for product in queryset}
    missing_ids = [product_id for product_id in product_ids if product_id not in products]
    if missing_ids:
        raise ValidationError({'items': 'Uno o mas productos no existen o estan inactivos.'})

    return products


def _validate_available_stock(items, products):
    quantities_by_product = {}
    for item in items:
        product_id = item['product_id']
        quantities_by_product[product_id] = quantities_by_product.get(product_id, 0) + item['quantity']

    for product_id, requested_quantity in quantities_by_product.items():
        product = products[product_id]
        if requested_quantity > product.stock:
            raise ValidationError(
                {'items': f'No hay stock suficiente para el producto {product.sku}.'}
            )


def _build_sale_lines(items, products):
    quote_items = []
    sale_items_data = []
    subtotal = Decimal('0.00')
    discount_total = Decimal('0.00')
    tax_total = Decimal('0.00')

    for item in items:
        product = products[item['product_id']]
        quantity = item['quantity']
        note = (item.get('note') or '').strip()
        line_subtotal = (product.sale_price * quantity).quantize(Decimal('0.01'))
        line_discount = (item.get('discount_amount') or Decimal('0.00')).quantize(Decimal('0.01'))

        if line_discount > line_subtotal:
            raise ValidationError(
                {'items': f'El descuento supera el subtotal del producto {product.sku}.'}
            )

        line_total = line_subtotal - line_discount
        line_tax = _calculate_included_tax(line_total, product.tax_rate)
        subtotal += line_subtotal
        discount_total += line_discount
        tax_total += line_tax

        quote_items.append(
            {
                'line_id': item.get('line_id', ''),
                'product_id': product.id,
                'name': product.name,
                'sku': product.sku,
                'barcode': product.barcode,
                'quantity': quantity,
                'unit_price': format_money(product.sale_price),
                'line_subtotal': format_money(line_subtotal),
                'discount_total': format_money(line_discount),
                'tax_total': format_money(line_tax),
                'line_total': format_money(line_total),
                'available_stock': product.stock,
                'note': note,
            }
        )
        sale_items_data.append(
            {
                'product': product,
                'product_name': product.name,
                'product_sku': product.sku,
                'quantity': quantity,
                'unit_price': product.sale_price,
                'discount_total': line_discount,
                'tax_total': line_tax,
                'line_total': line_total,
                'note': note,
            }
        )

    return {
        'quote_items': quote_items,
        'sale_items_data': sale_items_data,
        'subtotal': subtotal.quantize(Decimal('0.01')),
        'discount_total': discount_total.quantize(Decimal('0.01')),
        'tax_total': tax_total.quantize(Decimal('0.01')),
        'total': (subtotal - discount_total).quantize(Decimal('0.01')),
    }


def _build_payment(*, status, total, payment_method, amount_paid=None):
    method = payment_method or Sale.PaymentMethod.CASH

    if status == Sale.Status.PENDING:
        return {
            'payment_method': method,
            'amount_paid': Decimal('0.00'),
            'change_amount': Decimal('0.00'),
        }

    if amount_paid is None:
        amount_paid = total

    paid = amount_paid.quantize(Decimal('0.01'))

    if method == Sale.PaymentMethod.CASH:
        if paid < total:
            raise ValidationError({'amount_paid': 'El efectivo recibido no cubre el total.'})
        change_amount = paid - total
    else:
        if paid < total:
            raise ValidationError({'amount_paid': 'El monto pagado no cubre el total.'})
        change_amount = Decimal('0.00')
        paid = total

    return {
        'payment_method': method,
        'amount_paid': paid.quantize(Decimal('0.01')),
        'change_amount': change_amount.quantize(Decimal('0.01')),
    }


def _apply_sale_stock_exit(*, sale, items_data, user):
    for item_data in items_data:
        apply_stock_movement(
            product=item_data['product'],
            movement_type=StockMovement.MovementType.EXIT,
            quantity=item_data['quantity'],
            reason=f'Venta #{sale.id} completada',
            user=user,
            reference=f'sale:{sale.id}',
        )


def _calculate_included_tax(total, tax_rate):
    rate = (tax_rate or Decimal('0.00')).quantize(Decimal('0.01'))
    if rate <= 0:
        return Decimal('0.00')

    divisor = Decimal('100.00') + rate
    return (total * rate / divisor).quantize(Decimal('0.01'))
