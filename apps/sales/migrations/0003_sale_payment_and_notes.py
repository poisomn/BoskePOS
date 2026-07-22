from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0002_sale_cancelled_at_sale_completed_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='amount_paid',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='sale',
            name='change_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='sale',
            name='notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='sale',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('cash', 'Efectivo'),
                    ('debit', 'Debito'),
                    ('credit', 'Credito'),
                    ('transfer', 'Transferencia'),
                ],
                default='cash',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='saleitem',
            name='note',
            field=models.TextField(blank=True, default=''),
        ),
    ]
