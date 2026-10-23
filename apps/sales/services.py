from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json

from apps.accounts.permissions import has_role, ADMIN_ROLE
from apps.system_settings.models import BusinessSettings
from apps.cash.models import CashMovement
from apps.cash.services import lock_cashier, active_session, lock_operation_users, session_summary

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product, StockMovement
from apps.inventory.services import StockMovementError, apply_stock_movement
from apps.utils.money import validate_money_capacity

from .models import Sale, SaleItem

UNSET = object()


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
        'rounding_adjustment': format_money(totals['rounding_adjustment']),
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
    idempotency_key=None,
    discount_reason='',
    authorizer=None,
):
    authorizer = lock_operation_users(user, authorizer)
    fingerprint = hashlib.sha256(json.dumps({'items': items, 'customer': customer.pk if customer else None, 'status': status, 'payment_method': payment_method, 'amount_paid': amount_paid, 'notes': notes, 'discount_reason': discount_reason}, sort_keys=True, default=str).encode()).hexdigest()
    if idempotency_key:
        previous = Sale.objects.filter(user=user, idempotency_key=idempotency_key).first()
        if previous:
            if previous.user_id != user.pk or previous.request_fingerprint != fingerprint:
                raise ValidationError({'idempotency_key': 'La clave ya fue usada con otra operación.'})
            return previous
    session = active_session(user) if status == Sale.Status.COMPLETED else None
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

    _validate_discounts(user, totals['sale_items_data'], discount_reason, authorizer)
    sale = Sale.objects.create(
        cashier=user if session else None,
        cash_session=session,
        idempotency_key=idempotency_key,
        request_fingerprint=fingerprint,
        discount_reason=discount_reason,
        discount_authorized_by=authorizer,
        customer=customer,
        user=user,
        status=status,
        subtotal=totals['subtotal'],
        discount_total=totals['discount_total'],
        rounding_adjustment=totals['rounding_adjustment'],
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
        CashMovement.objects.create(session=session, kind='sale', method=payment_method, amount=sale.total, reason=f'Venta #{sale.pk}', user=user, sale=sale)

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def update_pending_sale(
    *,
    sale,
    user,
    customer=UNSET,
    items=None,
    payment_method=UNSET,
    amount_paid=UNSET,
    notes=UNSET,
    discount_reason=UNSET,
    authorizer=None,
    idempotency_key=None,
    from_presale=False,
):
    authorizer = lock_operation_users(user, authorizer)
    sale = Sale.objects.select_for_update().get(pk=sale.pk)
    if not from_presale and hasattr(sale, "presale_ticket"):
        raise SaleConflict("Esta venta pertenece a una preventa. Usa la cola de tickets.")

    if sale.status != Sale.Status.PENDING:
        raise SaleConflict('Solo se puede editar una venta pendiente.')

    totals = None
    if items is not None:
        if not items:
            raise ValidationError({'items': 'La venta debe incluir al menos un producto.'})
        products = _get_active_products(items)
        _validate_available_stock(items, products)
        totals = _build_sale_lines(items, products)
    payment = _build_payment(
        status=Sale.Status.PENDING,
        total=totals['total'] if totals else sale.total,
        payment_method=sale.payment_method if payment_method is UNSET else payment_method,
        amount_paid=sale.amount_paid if amount_paid is UNSET else amount_paid,
    )

    if customer is not UNSET:
        sale.customer = customer
    reason = sale.discount_reason if discount_reason is UNSET else discount_reason
    if totals:
        _validate_discounts(user, totals['sale_items_data'], reason, authorizer)
    sale.discount_reason = reason
    sale.discount_authorized_by = authorizer
    if totals:
        sale.subtotal = totals['subtotal']
        sale.discount_total = totals['discount_total']
        sale.rounding_adjustment = totals['rounding_adjustment']
        sale.tax_total = totals['tax_total']
        sale.total = totals['total']
    sale.payment_method = payment['payment_method']
    sale.amount_paid = payment['amount_paid']
    sale.change_amount = payment['change_amount']
    if notes is not UNSET:
        sale.notes = (notes or '').strip()
    sale.save(
        update_fields=(
            'customer',
            'discount_reason',
            'discount_authorized_by',
            'subtotal',
            'discount_total',
            'rounding_adjustment',
            'tax_total',
            'total',
            'payment_method',
            'amount_paid',
            'change_amount',
            'notes',
        )
    )
    if totals:
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
    idempotency_key=None,
    authorizer=None,
    from_presale=False,
):
    authorizer = lock_operation_users(user, authorizer)
    sale = (
        Sale.objects.select_for_update()
        .prefetch_related('items__product')
        .get(pk=sale.pk)
    )

    if not from_presale and hasattr(sale, "presale_ticket"):
        raise SaleConflict("Cobra este ticket desde la caja de preventas.")

    if sale.status == Sale.Status.COMPLETED and idempotency_key and sale.completion_key == idempotency_key and sale.cashier_id == user.pk:
        payment = _build_payment(status=Sale.Status.COMPLETED, total=sale.total, payment_method=payment_method, amount_paid=amount_paid)
        if payment['payment_method'] == sale.payment_method and payment['amount_paid'] == sale.amount_paid:
            return sale
        raise SaleConflict('La clave ya fue usada con otro pago.')
    if sale.status == Sale.Status.COMPLETED:
        raise SaleConflict('La venta ya esta completada.')
    if sale.status == Sale.Status.CANCELLED:
        raise SaleConflict('Una venta anulada no puede completarse.')

    session = active_session(user)

    if idempotency_key and Sale.objects.filter(cashier=user, completion_key=idempotency_key).exclude(pk=sale.pk).exists():
        raise SaleConflict('La clave de cobro ya fue usada para otra venta.')

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

    _validate_discounts(user, [{'discount_total': item.discount_total, 'unit_price': item.unit_price, 'quantity': item.quantity} for item in items], sale.discount_reason, authorizer or sale.discount_authorized_by)
    for item in items:
        item.unit_cost = locked_products[item.product_id].cost_price
        item.save(update_fields=('unit_cost',))
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
    CashMovement.objects.create(session=session, kind='sale', method=payment_method, amount=sale.total, reason=f'Venta #{sale.pk}', user=user, sale=sale)
    sale.cashier = user
    sale.cash_session = session
    sale.completion_key = idempotency_key
    sale.discount_authorized_by = authorizer or sale.discount_authorized_by
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
            'cashier',
            'cash_session',
            'completion_key',
            'discount_authorized_by',
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
    lock_cashier(user)
    session = active_session(user)
    sale = (
        Sale.objects.select_for_update()
        .prefetch_related('items__product')
        .get(pk=sale.pk)
    )

    if sale.status == Sale.Status.PENDING:
        raise SaleConflict('Una venta pendiente no requiere anulacion.')
    if sale.status == Sale.Status.CANCELLED:
        raise SaleConflict('La venta ya esta anulada.')

    if sale.payment_method == 'cash' and sale.total > Decimal(session_summary(session)['expected']['cash']):
        raise ValidationError({'cash_session': 'Efectivo insuficiente para devolver esta venta. Registra un ingreso antes de anular.'})

    for item in sale.items.select_related('product').order_by('product_id'):
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

    CashMovement.objects.create(session=session, kind='refund', method=sale.payment_method, amount=sale.total, reason=f'Anulación #{sale.pk}', user=user, sale=sale)
    sale.status = Sale.Status.CANCELLED
    sale.cancelled_at = timezone.now()
    sale.save(update_fields=('status', 'cancelled_at'))

    return Sale.objects.prefetch_related('items').select_related('customer', 'user').get(pk=sale.pk)


@transaction.atomic
def discard_pending_sale(*, sale):
    sale = Sale.objects.select_for_update().get(pk=sale.pk)

    if hasattr(sale, "presale_ticket"):
        raise SaleConflict("Las preventas se cancelan con motivo; no se eliminan.")
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
        percent = item.get('discount_percent')
        line_discount = ((line_subtotal * Decimal(percent) / 100) if percent is not None else (item.get('discount_amount') or Decimal('0.00'))).quantize(Decimal('0.01'))

        if line_discount > line_subtotal:
            raise ValidationError(
                {'items': f'El descuento supera el subtotal del producto {product.sku}.'}
            )

        line_total = line_subtotal - line_discount
        line_tax = _calculate_included_tax(line_total, product.tax_rate)
        subtotal += line_subtotal
        validate_money_capacity(subtotal)
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
                'tax_rate': str(product.tax_rate),
                'discount_percent': percent,
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
                'unit_cost': product.cost_price,
                'tax_rate': product.tax_rate,
                'discount_percent': percent,
                'discount_total': line_discount,
                'tax_total': line_tax,
                'line_total': line_total,
                'note': note,
            }
        )

    raw_total = (subtotal - discount_total).quantize(Decimal('0.01'))
    rounded_total = raw_total.quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    validate_money_capacity(rounded_total)
    rounding = rounded_total - raw_total
    if rounding and sale_items_data:
        index = max(range(len(sale_items_data)), key=lambda i: sale_items_data[i]['line_total'])
        line = sale_items_data[index]
        previous_tax = line['tax_total']
        line['line_total'] += rounding
        line['rounding_adjustment'] = rounding
        line['tax_total'] = _calculate_included_tax(line['line_total'], line['tax_rate'])
        tax_total += line['tax_total'] - previous_tax
        quote_items[index]['line_total'] = format_money(line['line_total'])
        quote_items[index]['tax_total'] = format_money(line['tax_total'])
        quote_items[index]['rounding_adjustment'] = format_money(rounding)
    return {
        'quote_items': quote_items,
        'rounding_adjustment': rounding,
        'sale_items_data': sale_items_data,
        'subtotal': subtotal.quantize(Decimal('0.01')),
        'discount_total': discount_total.quantize(Decimal('0.01')),
        'tax_total': tax_total.quantize(Decimal('0.01')),
        'total': rounded_total.quantize(Decimal('0.01')),
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
        if paid != paid.quantize(Decimal('1')):
            raise ValidationError({'amount_paid': 'Ingresa el efectivo recibido en pesos enteros.'})
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


def _validate_discounts(user, items, reason, authorizer=None):
    limit = BusinessSettings.get_solo().seller_discount_limit
    discounted = [item for item in items if item['discount_total'] > 0]
    if discounted and not reason.strip():
        raise ValidationError({'discount_reason': 'Indica el motivo del descuento.'})
    exceeds = any(item['discount_total'] * 100 > item['unit_price'] * item['quantity'] * limit for item in discounted)
    if exceeds and not has_role(user, ADMIN_ROLE):
        if not authorizer or not authorizer.is_active or not has_role(authorizer, ADMIN_ROLE) or not authorizer.authorization_pin_hash:
            raise ValidationError({'discount_authorization': f'El descuento supera el límite de {limit}%. Requiere PIN de administrador.'})
