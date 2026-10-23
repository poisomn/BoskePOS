from django.db import migrations

def stations(apps, schema_editor):
    Station = apps.get_model('sales', 'PresaleStation')
    for name in ('Preventa 1 · Mesón', 'Preventa 2 · Patio'):
        Station.objects.get_or_create(name=name)

class Migration(migrations.Migration):
    dependencies = [('sales', '0007_presalestation_operationevent_presaleticket')]
    operations = [migrations.RunPython(stations, migrations.RunPython.noop)]
