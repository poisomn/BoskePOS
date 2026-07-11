from django.db import models

from apps.utils.rut import normalize_rut


class Supplier(models.Model):
    name = models.CharField(max_length=180)
    rut = models.CharField(max_length=12, unique=True, null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('name',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.email = self.email.strip()
        self.phone = self.phone.strip()
        self.address = self.address.strip()
        self.city = self.city.strip()

        if self.rut:
            self.rut = normalize_rut(self.rut)
        else:
            self.rut = None

        super().save(*args, **kwargs)
