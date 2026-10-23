from django.db import migrations
from django.db.models import F

def backfill(apps, schema_editor):
    Item = apps.get_model('purchases', 'PurchaseItem')
    Item.objects.filter(purchase__status__in=('confirmed', 'cancelled')).update(received_quantity=F('quantity'))

class Migration(migrations.Migration):
    dependencies = [('purchases', '0002_purchaseitem_received_quantity_alter_purchase_status_and_more')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
