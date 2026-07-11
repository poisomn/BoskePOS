from django.contrib import admin

from .models import Purchase, PurchaseItem


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseItem
    extra = 0
    readonly_fields = ('product_name', 'product_sku', 'line_total')


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'supplier', 'status', 'reference', 'total', 'user', 'created_at')
    list_filter = ('status', 'created_at', 'supplier')
    search_fields = ('id', 'reference', 'supplier__name', 'supplier__rut')
    readonly_fields = ('subtotal', 'total', 'confirmed_at', 'cancelled_at', 'created_at', 'updated_at')
    inlines = (PurchaseItemInline,)
    list_select_related = ('supplier', 'user')
