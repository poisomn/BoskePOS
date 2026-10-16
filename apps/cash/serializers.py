from rest_framework import serializers
from decimal import Decimal
from .models import CashRegister, CashSession, CashMovement
from .services import session_summary, METHODS


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashRegister
        fields = ('id', 'name', 'is_active')


class SessionSerializer(serializers.ModelSerializer):
    register_name = serializers.CharField(source='register.name', read_only=True)
    cashier_email = serializers.CharField(source='cashier.email', read_only=True)
    authorized_by_email = serializers.CharField(source='authorized_by.email', read_only=True, allow_null=True)
    counted_by_email = serializers.CharField(source='counted_by.email', read_only=True, allow_null=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = CashSession
        fields = ('id', 'register', 'register_name', 'cashier', 'cashier_email', 'opening_amount', 'opened_at', 'closed_at', 'counted_by', 'counted_by_email', 'authorized_by', 'authorized_by_email', 'closing_notes', 'summary')
        read_only_fields = fields

    def get_summary(self, obj):
        return session_summary(obj)


class OpenSerializer(serializers.Serializer):
    register = serializers.PrimaryKeyRelatedField(queryset=CashRegister.objects.filter(is_active=True))
    opening_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)

    def validate_opening_amount(self, value):
        if value != value.quantize(Decimal('1')):
            raise serializers.ValidationError('El fondo se cuenta en pesos enteros.')
        return value


class MovementInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=('entry', 'withdrawal'))
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    reason = serializers.CharField(max_length=500, allow_blank=False)

    def validate_amount(self, value):
        if value != value.quantize(Decimal('1')):
            raise serializers.ValidationError('El efectivo se registra en pesos enteros.')
        return value


class MovementSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = CashMovement
        fields = ('id', 'kind', 'method', 'amount', 'reason', 'user_email', 'sale', 'created_at')


class AuthorizationSerializer(serializers.Serializer):
    admin_id = serializers.IntegerField(min_value=1)
    pin = serializers.RegexField(r'^[0-9]{4}$', write_only=True)


class CloseSerializer(AuthorizationSerializer):
    counted = serializers.DictField(child=serializers.DecimalField(max_digits=12, decimal_places=2))
    notes = serializers.CharField(max_length=1000, allow_blank=True, default='')

    def validate_counted(self, value):
        if set(value) != set(METHODS):
            raise serializers.ValidationError('Declara efectivo, débito, crédito y transferencia.')
        if value['cash'] < 0:
            raise serializers.ValidationError('El efectivo físico no puede ser negativo.')
        if value['cash'] != value['cash'].quantize(Decimal('1')):
            raise serializers.ValidationError('Cuenta el efectivo en pesos enteros.')
        return value
