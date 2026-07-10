from rest_framework import serializers


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
