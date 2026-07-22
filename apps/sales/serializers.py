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
    line_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    discount_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        required=False,
    )
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


class PosCartQuoteInputSerializer(serializers.Serializer):
    items = PosCartItemInputSerializer(many=True, allow_empty=True)


class SaleCreateSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    items = PosCartItemInputSerializer(many=True, allow_empty=False)
    status = serializers.ChoiceField(
        choices=(Sale.Status.PENDING, Sale.Status.COMPLETED),
        default=Sale.Status.COMPLETED,
        required=False,
    )
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices,
        default=Sale.PaymentMethod.CASH,
        required=False,
    )
    amount_paid = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_customer_id(self, value):
        if value is None:
            return None

        try:
            return Customer.objects.get(pk=value, is_active=True)
        except Customer.DoesNotExist as exc:
            raise serializers.ValidationError('El cliente no existe o esta inactivo.') from exc


class SaleUpdateSerializer(SaleCreateSerializer):
    status = None


class SaleCompleteSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=Sale.PaymentMethod.choices,
        default=Sale.PaymentMethod.CASH,
        required=False,
    )
    amount_paid = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        required=False,
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)


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
            'note',
        )
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_label = serializers.CharField(source='get_payment_method_display', read_only=True)

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
            'payment_method',
            'payment_method_label',
            'amount_paid',
            'change_amount',
            'notes',
            'items',
            'completed_at',
            'cancelled_at',
            'created_at',
        )
        read_only_fields = fields
