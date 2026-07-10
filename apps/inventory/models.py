from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator
from django.db.models.functions import Lower, Trim


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)
        verbose_name = 'category'
        verbose_name_plural = 'categories'
        constraints = [
            models.UniqueConstraint(
                Lower(Trim('name')),
                name='unique_category_normalized_name',
            ),
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    class ProductUnit(models.TextChoices):
        UNIT = 'unidad', 'Unidad'
        METER = 'metro', 'Metro'
        KILOGRAM = 'kilo', 'Kilogramo'
        LITER = 'litro', 'Litro'
        BOX = 'caja', 'Caja'
        BAG = 'bolsa', 'Bolsa'
        ROLL = 'rollo', 'Rollo'
        PAIR = 'par', 'Par'

    category = models.ForeignKey(
        Category,
        related_name='products',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=180)
    sku = models.CharField(max_length=64, unique=True)
    barcode = models.CharField(max_length=64, unique=True, null=True, blank=True)
    brand = models.CharField(max_length=100, blank=True, default='')
    unit = models.CharField(
        max_length=20,
        choices=ProductUnit.choices,
        default=ProductUnit.UNIT,
    )
    location = models.CharField(max_length=50, blank=True, default='')
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    description = models.TextField(blank=True)
    cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    sale_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('19.00'),
        validators=[MinValueValidator(0)],
    )
    stock = models.PositiveIntegerField(default=0)
    minimum_stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def save(self, *args, **kwargs):
        self.sku = self.sku.strip().upper()
        self.barcode = self.barcode.strip() if self.barcode else None
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.sku})'
