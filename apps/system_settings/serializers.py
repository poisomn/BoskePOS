from rest_framework import serializers

from .models import BusinessSettings


class BusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessSettings
        fields = (
            'business_name',
            'rut',
            'giro',
            'address',
            'city',
            'phone',
            'email',
            'currency',
            'default_tax_rate',
            'ticket_footer',
            'updated_at',
        )
        read_only_fields = ('updated_at',)

    def validate_business_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre del negocio es obligatorio.')
        return value

    def validate_currency(self, value):
        value = value.strip().upper()
        if len(value) != 3:
            raise serializers.ValidationError('La moneda debe usar codigo ISO de 3 letras.')
        return value
