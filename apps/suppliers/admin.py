from django.contrib import admin

from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'rut', 'email', 'phone', 'city', 'is_active')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'rut', 'email', 'phone')
