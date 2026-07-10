from decimal import Decimal

from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product


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


def format_money(value):
    return f'{value.quantize(Decimal("0.01"))}'
