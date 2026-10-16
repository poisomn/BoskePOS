from django.db import migrations


def create_register(apps, schema_editor):
    Register = apps.get_model('cash', 'CashRegister')
    if not Register.objects.using(schema_editor.connection.alias).exists():
        Register.objects.using(schema_editor.connection.alias).create(name='Caja principal')


class Migration(migrations.Migration):
    dependencies = [('cash', '0001_initial')]
    operations = [migrations.RunPython(create_register, migrations.RunPython.noop)]
