from rest_framework import serializers

from apps.utils.rut import RutError, normalize_rut

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
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
            raise serializers.ValidationError('La razon social del proveedor es obligatoria.')
        return value

    def validate_rut(self, value):
        try:
            normalized_rut = normalize_rut(value)
        except RutError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        if normalized_rut is None:
            return None

        queryset = Supplier.objects.filter(rut=normalized_rut)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('Ya existe un proveedor con este RUT.')

        return normalized_rut
