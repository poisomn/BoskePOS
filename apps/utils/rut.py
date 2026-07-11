import re

from django.core.exceptions import ValidationError


class RutError(ValueError):
    pass


def normalize_rut(value):
    if value is None:
        return None

    cleaned = re.sub(r'[^0-9kK]', '', str(value)).upper()
    if not cleaned:
        return None

    if len(cleaned) < 2:
        raise RutError('El RUT debe incluir cuerpo y digito verificador.')

    body = cleaned[:-1]
    verifier = cleaned[-1]

    if not body.isdigit():
        raise RutError('El cuerpo del RUT debe contener solo numeros.')

    expected_verifier = calculate_rut_verifier(body)
    if verifier != expected_verifier:
        raise RutError('El digito verificador del RUT no es valido.')

    return f'{int(body)}-{verifier}'


def calculate_rut_verifier(body):
    total = 0
    multiplier = 2

    for digit in reversed(str(body)):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1

    result = 11 - (total % 11)
    if result == 11:
        return '0'
    if result == 10:
        return 'K'
    return str(result)


def validate_rut(value):
    try:
        return normalize_rut(value)
    except RutError as exc:
        raise ValidationError(str(exc)) from exc
