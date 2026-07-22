from django.contrib import admin

from .models import BusinessSettings


@admin.register(BusinessSettings)
class BusinessSettingsAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'rut', 'currency', 'default_tax_rate', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_delete_permission(self, request, obj=None):
        return False
