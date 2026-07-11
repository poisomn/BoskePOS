from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_select_related = ('category',)
    list_display = (
        'image_preview',
        'name',
        'category',
        'brand',
        'sku',
        'stock',
        'unit',
        'location',
        'cost_price',
        'sale_price',
        'is_active',
    )
    list_filter = ('is_active', 'category', 'brand', 'unit', 'tax_rate')
    search_fields = ('name', 'sku', 'barcode', 'brand')

    @admin.display(description='Image')
    def image_preview(self, obj):
        if not obj.image:
            return '-'

        return format_html(
            '<img src="{}" style="height: 40px; width: 40px; object-fit: cover; border-radius: 4px;" />',
            obj.image.url,
        )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_select_related = ('product', 'user')
    list_display = (
        'product',
        'movement_type',
        'quantity',
        'stock_before',
        'stock_after',
        'user',
        'created_at',
    )
    list_filter = ('movement_type', 'created_at')
    search_fields = ('product__name', 'product__sku', 'product__barcode', 'reason')
    readonly_fields = (
        'product',
        'movement_type',
        'quantity',
        'reason',
        'user',
        'stock_before',
        'stock_after',
        'reference',
        'created_at',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
