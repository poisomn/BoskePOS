from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Purchase(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Borrador'
        CONFIRMED = 'confirmed', 'Confirmada'
        CANCELLED = 'cancelled', 'Anulada'

    supplier = models.ForeignKey(
        'suppliers.Supplier',
        related_name='purchases',
        on_delete=models.PROTECT,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='purchases',
        on_delete=models.PROTECT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    reference = models.CharField(max_length=120, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)
        indexes = (
            models.Index(fields=('status', 'created_at')),
            models.Index(fields=('supplier', 'created_at')),
        )

    def __str__(self):
        return f'Compra #{self.id}'


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(
        'inventory.Product',
        related_name='purchase_items',
        on_delete=models.PROTECT,
    )
    product_name = models.CharField(max_length=180)
    product_sku = models.CharField(max_length=64)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ('id',)
        constraints = (
            models.UniqueConstraint(
                fields=('purchase', 'product'),
                name='unique_purchase_product_line',
            ),
        )

    def __str__(self):
        return f'{self.product_sku} x {self.quantity}'
