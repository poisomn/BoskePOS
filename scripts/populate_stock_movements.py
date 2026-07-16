import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command

from apps.inventory.models import Product
from apps.inventory.services import apply_stock_movement

User = get_user_model()

call_command('seed_roles')
call_command('seed_inventory')

users_data = [
    ('admin@boskepos.cl', True, True),
    ('inventory@boskepos.cl', False, True),
    ('seller@boskepos.cl', False, True),
]

for email, is_superuser, is_staff in users_data:
    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.create_user(
            email=email,
            password='Admin.001.ferre',
            is_staff=is_staff,
            is_superuser=is_superuser,
            is_active=True,
        )
        print(f'Created user {email}')
    else:
        print(f'User already exists {email}')

    if email == 'inventory@boskepos.cl':
        role_name = 'encargado_inventario'
    elif email == 'seller@boskepos.cl':
        role_name = 'vendedor'
    else:
        role_name = 'administrador'

    group = Group.objects.get(name=role_name)
    user.groups.add(group)
    print(f'Added {email} to group {role_name}')

admin_user = User.objects.get(email='admin@boskepos.cl')
call_command('create_initial_stock_movements', user_email=admin_user.email)
print('Created initial stock movements for current product stock')

stock_exit_data = [
    ('HMA-DSC-002', 1, User.objects.get(email='seller@boskepos.cl'), 'Venta de prueba: destornillador'),
    ('HMA-CTM-003', 1, User.objects.get(email='seller@boskepos.cl'), 'Venta de prueba: cinta metrica'),
    ('ILU-PHI-001', 10, User.objects.get(email='inventory@boskepos.cl'), 'Salida por inventario'),
    ('LUB-WD40-001', 5, User.objects.get(email='inventory@boskepos.cl'), 'Salida por mantenimiento'),
    ('ESC-GEN-002', 2, User.objects.get(email='seller@boskepos.cl'), 'Venta de plataforma andamio'),
]

for sku, qty, user, reason in stock_exit_data:
    try:
        product = Product.objects.get(sku=sku)
    except Product.DoesNotExist:
        print('Skipped movement, product missing:', sku)
        continue

    if product.stock < qty:
        print('Skipped movement, insufficient stock:', sku, product.stock)
        continue

    apply_stock_movement(
        product=product,
        movement_type='exit',
        quantity=qty,
        reason=reason,
        user=user,
    )
    print(f'Created exit movement {qty} x {sku} by {user.email}')

print('Stock population complete')
