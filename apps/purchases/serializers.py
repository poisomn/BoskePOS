from decimal import Decimal

from rest_framework import serializers

from apps.suppliers.models import Supplier

from .models import Purchase, PurchaseItem
from .services import save_purchase_draft


class PurchaseItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'))


class PurchaseWriteSerializer(serializers.Serializer):
    supplier_id = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(required=False, allow_blank=True, max_length=120)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = PurchaseItemInputSerializer(many=True, allow_empty=False)

    def validate_supplier_id(self, value):
        try:
            return Supplier.objects.get(pk=value, is_active=True)
        except Supplier.DoesNotExist as exc:
            raise serializers.ValidationError('El proveedor no existe o esta inactivo.') from exc

    def create(self, validated_data):
        return save_purchase_draft(
            user=self.context['request'].user,
            supplier=validated_data['supplier_id'],
            reference=validated_data.get('reference', ''),
            notes=validated_data.get('notes', ''),
            items=validated_data['items'],
        )

    def update(self, instance, validated_data):
        return save_purchase_draft(
            user=self.context['request'].user,
            supplier=validated_data['supplier_id'],
            reference=validated_data.get('reference', ''),
            notes=validated_data.get('notes', ''),
            items=validated_data['items'],
            purchase=instance,
        )


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_barcode = serializers.CharField(source='product.barcode', read_only=True, allow_null=True)

    class Meta:
        model = PurchaseItem
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'product_barcode',
            'quantity',
            'unit_cost',
            'line_total',
        )
        read_only_fields = fields


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_rut = serializers.CharField(source='supplier.rut', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Purchase
        fields = (
            'id',
            'supplier',
            'supplier_name',
            'supplier_rut',
            'user',
            'user_email',
            'status',
            'status_label',
            'reference',
            'notes',
            'subtotal',
            'total',
            'items',
            'confirmed_at',
            'cancelled_at',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_rut = serializers.CharField(source='supplier.rut', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Purchase
        fields = (
            'id',
            'supplier',
            'supplier_name',
            'supplier_rut',
            'user_email',
            'status',
            'status_label',
            'reference',
            'subtotal',
            'total',
            'created_at',
            'confirmed_at',
            'cancelled_at',
        )
        read_only_fields = fields
