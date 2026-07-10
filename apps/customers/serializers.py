import re

from rest_framework import serializers

from .models import Customer


def normalize_rut(value):
    if value is None:
        return None

    cleaned = re.sub(r'[^0-9kK]', '', value).upper()
    if not cleaned:
        return None
    if len(cleaned) < 2:
        raise serializers.ValidationError('RUT must include body and verifier digit.')

    body = cleaned[:-1]
    verifier = cleaned[-1]

    if not body.isdigit():
        raise serializers.ValidationError('RUT body must contain only numbers.')

    expected_verifier = calculate_rut_verifier(body)
    if verifier != expected_verifier:
        raise serializers.ValidationError('Invalid RUT verifier digit.')

    return f'{int(body)}-{verifier}'


def calculate_rut_verifier(body):
    total = 0
    multiplier = 2

    for digit in reversed(body):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1

    result = 11 - (total % 11)
    if result == 11:
        return '0'
    if result == 10:
        return 'K'
    return str(result)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = (
            'id',
            'name',
            'rut',
            'email',
            'phone',
            'address',
            'city',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'rut': {'validators': []},
        }

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Customer name is required.')
        return value

    def validate_rut(self, value):
        normalized_rut = normalize_rut(value)
        if normalized_rut is None:
            return None

        queryset = Customer.objects.filter(rut=normalized_rut)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('A customer with this RUT already exists.')

        return normalized_rut
