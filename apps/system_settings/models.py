from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class BusinessSettings(models.Model):
    business_name = models.CharField(max_length=180, default='BoskePOS')
    rut = models.CharField(max_length=20, blank=True, default='')
    giro = models.CharField(max_length=180, blank=True, default='')
    address = models.CharField(max_length=240, blank=True, default='')
    city = models.CharField(max_length=120, blank=True, default='')
    phone = models.CharField(max_length=40, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    currency = models.CharField(max_length=3, default='CLP')
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('19.00'),
        validators=[MinValueValidator(0)],
    )
    ticket_footer = models.CharField(max_length=240, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'business settings'
        verbose_name_plural = 'business settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        self.business_name = self.business_name.strip() or 'BoskePOS'
        self.rut = self.rut.strip().upper()
        self.giro = self.giro.strip()
        self.address = self.address.strip()
        self.city = self.city.strip()
        self.phone = self.phone.strip()
        self.email = self.email.strip().lower()
        self.currency = (self.currency.strip().upper() or 'CLP')[:3]
        self.ticket_footer = self.ticket_footer.strip()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return None

    def __str__(self):
        return self.business_name

    @classmethod
    def get_solo(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
