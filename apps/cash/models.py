from django.conf import settings
from django.db import models
from django.db.models import Q


class CashRegister(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ('name',)


class CashSession(models.Model):
    register = models.ForeignKey(CashRegister, on_delete=models.PROTECT)
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='cash_sessions')
    opening_amount = models.DecimalField(max_digits=12, decimal_places=2)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    counted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT, related_name='+')
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.PROTECT, related_name='+')
    closing_notes = models.TextField(blank=True)
    closing_summary = models.JSONField(default=dict)

    class Meta:
        ordering = ('-opened_at',)
        constraints = [
            models.UniqueConstraint(fields=('register',), condition=Q(closed_at__isnull=True), name='cash_one_open_register'),
            models.UniqueConstraint(fields=('cashier',), condition=Q(closed_at__isnull=True), name='cash_one_open_cashier'),
            models.CheckConstraint(condition=Q(opening_amount__gte=0), name='cash_nonnegative_opening'),
        ]


class CashMovement(models.Model):
    class Kind(models.TextChoices):
        SALE = 'sale', 'Venta'
        REFUND = 'refund', 'Anulación'
        ENTRY = 'entry', 'Ingreso'
        WITHDRAWAL = 'withdrawal', 'Retiro'

    session = models.ForeignKey(CashSession, related_name='movements', on_delete=models.PROTECT)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    method = models.CharField(max_length=20, choices=(('cash', 'Efectivo'), ('debit', 'Débito'), ('credit', 'Crédito'), ('transfer', 'Transferencia')))
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=500)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    sale = models.ForeignKey('sales.Sale', null=True, blank=True, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('created_at', 'id')
        constraints = [
            models.CheckConstraint(condition=Q(amount__gte=0), name='cash_nonnegative_movement'),
            models.UniqueConstraint(fields=('sale', 'kind'), condition=Q(sale__isnull=False), name='cash_unique_sale_event'),
        ]
