"""Auditoría de cambios de catálogo y documentos sin registrar credenciales."""
from contextvars import ContextVar
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

request_context = ContextVar('operation_request', default=None)
tracked = {
    'inventory.product': ('name', 'sale_price', 'cost_price', 'stock', 'minimum_stock', 'is_active', 'location'),
    'inventory.category': ('name', 'is_active'),
    'customers.customer': ('name', 'is_active'),
    'suppliers.supplier': ('name', 'is_active'),
    'sales.sale': ('status', 'total', 'discount_total', 'cashier_id'),
    'purchases.purchase': ('status', 'total', 'reference'),
}


class AuditContextMiddleware:
    def __init__(self, get_response): self.get_response = get_response
    def __call__(self, request):
        token = request_context.set(request)
        try:
            return self.get_response(request)
        finally: request_context.reset(token)


@receiver(pre_save)
def before_change(sender, instance, **kwargs):
    if request_context.get() is None or sender._meta.label_lower not in tracked: return
    fields = tracked[sender._meta.label_lower]
    instance._audit_before = sender.objects.filter(pk=instance.pk).values(*fields).first() if instance.pk else None


@receiver(post_save)
def after_change(sender, instance, created, **kwargs):
    request = request_context.get()
    if request is None or sender._meta.label_lower not in tracked or not request.user.is_authenticated: return
    from .models import OperationEvent
    fields = tracked[sender._meta.label_lower]
    before = getattr(instance, '_audit_before', None) or {}
    changes = {key: {'before': str(before.get(key, '')), 'after': str(getattr(instance, key, ''))}
               for key in fields if created or before.get(key) != getattr(instance, key, None)}
    if changes:
        detail = {'changes': changes}
        if sender._meta.label_lower == 'inventory.product':
            detail['products'] = [{'id': instance.pk, 'name': instance.name, 'sku': instance.sku}]
        OperationEvent.objects.create(actor=request.user, entity=sender._meta.label_lower, entity_id=str(instance.pk),
                                      action='created' if created else 'updated', detail=detail)


@receiver(post_save)
def stock_movement_created(sender, instance, created, **kwargs):
    if sender._meta.label_lower != 'inventory.stockmovement' or not created or request_context.get() is None:
        return
    from .models import OperationEvent
    OperationEvent.objects.create(actor=instance.user, entity='inventory.stockmovement', entity_id=str(instance.pk),
        action='stock_moved', detail={
            'products': [{'id': instance.product_id, 'name': instance.product.name, 'sku': instance.product.sku}],
            'movement_type': instance.get_movement_type_display(), 'quantity': instance.quantity,
            'stock_before': instance.stock_before, 'stock_after': instance.stock_after,
            'reason': instance.reason, 'reference': instance.reference,
        })


@receiver(post_delete)
def after_delete(sender, instance, **kwargs):
    request = request_context.get()
    if request is None or sender._meta.label_lower not in tracked or not request.user.is_authenticated: return
    from .models import OperationEvent
    detail = {}
    if sender._meta.label_lower == 'inventory.product':
        detail['products'] = [{'id': instance.pk, 'name': instance.name, 'sku': instance.sku}]
    OperationEvent.objects.create(actor=request.user, entity=sender._meta.label_lower, entity_id=str(instance.pk), action='deleted', detail=detail)
