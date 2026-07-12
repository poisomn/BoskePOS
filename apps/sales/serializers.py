from rest_framework import serializers

from apps.customers.models import Customer

from .models import Sale, SaleItem


class PosProductSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    sku = serializers.CharField()
    barcode = serializers.CharField(allow_null=True)
    sale_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    stock = serializers.IntegerField()


class PosCartItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class PosCartQuoteInputSerializer(serializers.Serializer):
    items = PosCartItemInputSerializer(many=True, allow_empty=True)


class SaleCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    items = PosCartItemInputSerializer(many=True, allow_empty=False)

    def validate_customer_id(self, value):
        if value is None:
            return None

        try:
            return Customer.objects.get(pk=value, is_active=True)
        except Customer.DoesNotExist as exc:
            raise serializers.ValidationError('El cliente no existe o esta inactivo.') from exc


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = (
            'id',
            'product',
            'product_name',
            'product_sku',
            'quantity',
            'unit_price',
            'discount_total',
            'tax_total',
            'line_total',
        )
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Sale
        fields = (
            'id',
            'customer',
            'customer_name',
            'user',
            'user_email',
            'status',
            'status_label',
            'subtotal',
            'discount_total',
            'tax_total',
            'total',
            'items',
            'completed_at',
            'cancelled_at',
            'created_at',
        )
        read_only_fields = fields
