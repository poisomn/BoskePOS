from django.db import models


class Sale(models.Model):
    rounding_adjustment = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    cashier = models.ForeignKey('accounts.User', null=True, blank=True, related_name='collected_sales', on_delete=models.PROTECT)
    cash_session = models.ForeignKey('cash.CashSession', null=True, blank=True, on_delete=models.PROTECT)
    idempotency_key = models.UUIDField(null=True, blank=True)
    completion_key = models.UUIDField(null=True, blank=True)
    request_fingerprint = models.CharField(max_length=64, blank=True, default='')
    discount_reason = models.CharField(max_length=500, blank=True, default='')
    discount_authorized_by = models.ForeignKey('accounts.User', null=True, blank=True, related_name='+', on_delete=models.PROTECT)
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        COMPLETED = 'completed', 'Completada'
        CANCELLED = 'cancelled', 'Anulada'

    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Efectivo'
        DEBIT = 'debit', 'Debito'
        CREDIT = 'credit', 'Credito'
        TRANSFER = 'transfer', 'Transferencia'

    customer = models.ForeignKey(
        'customers.Customer',
        related_name='sales',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        'accounts.User',
        related_name='sales',
        on_delete=models.PROTECT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
    )
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    change_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default='')
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(fields=('user', 'idempotency_key'), name='sale_actor_idempotency'),
            models.UniqueConstraint(fields=('cashier', 'completion_key'), name='sale_cashier_completion'),
        ]

    def __str__(self):
        return f'Sale #{self.id}'


class SaleItem(models.Model):
    rounding_adjustment = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(
        'inventory.Product',
        related_name='sale_items',
        on_delete=models.PROTECT,
    )
    product_name = models.CharField(max_length=180)
    product_sku = models.CharField(max_length=64)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ('id',)

    def __str__(self):
        return f'{self.product_sku} x {self.quantity}'
