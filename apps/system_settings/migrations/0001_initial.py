from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='BusinessSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('business_name', models.CharField(default='BoskePOS', max_length=180)),
                ('rut', models.CharField(blank=True, default='', max_length=20)),
                ('giro', models.CharField(blank=True, default='', max_length=180)),
                ('address', models.CharField(blank=True, default='', max_length=240)),
                ('city', models.CharField(blank=True, default='', max_length=120)),
                ('phone', models.CharField(blank=True, default='', max_length=40)),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('currency', models.CharField(default='CLP', max_length=3)),
                (
                    'default_tax_rate',
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal('19.00'),
                        max_digits=5,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ('ticket_footer', models.CharField(blank=True, default='', max_length=240)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'business settings',
                'verbose_name_plural': 'business settings',
            },
        ),
    ]
