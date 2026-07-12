from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = (
        'product',
        'product_name',
        'product_sku',
        'quantity',
        'unit_price',
        'discount_total',
        'tax_total',
        'line_total',
    )
    can_delete = False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'user', 'status', 'total', 'created_at')
    list_filter = ('status', 'created_at', 'completed_at', 'cancelled_at')
    search_fields = ('id', 'customer__name', 'customer__rut', 'user__email')
    readonly_fields = (
        'subtotal',
        'discount_total',
        'tax_total',
        'total',
        'completed_at',
        'cancelled_at',
        'created_at',
    )
    list_select_related = ('customer', 'user')
    inlines = (SaleItemInline,)
