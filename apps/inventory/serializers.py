from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {
            'name': {'validators': []},
        }

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError('El nombre de la categoria es obligatorio.')

        queryset = Category.objects.filter(name__iexact=value)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('Ya existe una categoria con este nombre.')

        return value


class ProductSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'category',
            'category_detail',
            'name',
            'sku',
            'barcode',
            'brand',
            'unit',
            'location',
            'image',
            'description',
            'cost_price',
            'sale_price',
            'tax_rate',
            'stock',
            'minimum_stock',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'category_detail', 'created_at', 'updated_at')
        extra_kwargs = {
            'sku': {'validators': []},
            'barcode': {'validators': []},
        }

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError('El nombre del producto es obligatorio.')

        return value

    def validate_sku(self, value):
        value = value.strip().upper()

        if not value:
            raise serializers.ValidationError('El SKU del producto es obligatorio.')

        queryset = Product.objects.filter(sku=value)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('Ya existe un producto con este SKU.')

        return value

    def validate_barcode(self, value):
        if value is None:
            return None

        value = value.strip()
        if not value:
            return None

        queryset = Product.objects.filter(barcode=value)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError('Ya existe un producto con este codigo de barras.')

        return value

    def validate_category(self, value):
        if value and not value.is_active:
            raise serializers.ValidationError('No se puede asignar una categoria inactiva.')

        return value
