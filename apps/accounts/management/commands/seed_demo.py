"""Isolated demonstration setup. Never targets the business PostgreSQL database."""
import json
import secrets
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, CommandError, call_command
from django.db import transaction


class Command(BaseCommand):
    help = 'Prepara una demo SQLite con credenciales aleatorias y catalogo ficticio.'

    @transaction.atomic
    def handle(self, *args, **options):
        db = settings.DATABASES['default']
        expected = (settings.BASE_DIR / 'logs' / 'demo.sqlite3').resolve()
        if not settings.DEBUG or db['ENGINE'] != 'django.db.backends.sqlite3' or Path(db['NAME']).resolve() != expected:
            raise CommandError('Usa DEBUG=True, DB_ENGINE=sqlite y SQLITE_NAME=logs/demo.sqlite3.')
        call_command('seed_roles', verbosity=0)
        user, created = get_user_model().objects.get_or_create(
            email='demo@boskepos.local', defaults={'is_staff': True, 'is_superuser': True})
        credentials = settings.BASE_DIR / 'logs' / 'demo-access.json'
        if created or not credentials.exists():
            password = secrets.token_urlsafe(18)
            user.set_password(password)
            user.save(update_fields=('password',))
            credentials.parent.mkdir(exist_ok=True)
            credentials.write_text(json.dumps({'email': user.email, 'password': password}, indent=2), encoding='utf-8')
        if created:
            call_command('seed_inventory', verbosity=0)
            call_command('create_initial_stock_movements', user_email=user.email, verbosity=0)
        self.stdout.write(self.style.SUCCESS(f'Demo lista. Credenciales locales: {credentials}'))
