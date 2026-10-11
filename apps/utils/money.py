from decimal import Decimal

from rest_framework.exceptions import ValidationError


MAX_MONEY = Decimal('9999999999.99')


def validate_money_capacity(value):
    if not value.is_finite() or value < 0 or value > MAX_MONEY:
        raise ValidationError({'items': 'El monto calculado excede el limite permitido por operacion.'})
    return value
