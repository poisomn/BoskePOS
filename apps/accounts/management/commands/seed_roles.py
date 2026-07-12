from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from apps.accounts.permissions import ROLE_LABELS


class Command(BaseCommand):
    help = 'Crea los grupos iniciales de BoskePOS de forma idempotente.'

    def handle(self, *args, **options):
        for role, label in ROLE_LABELS.items():
            group, created = Group.objects.get_or_create(name=role)
            if options.get('verbosity', 1) > 0:
                action = 'creado' if created else 'existente'
                self.stdout.write(f'{label}: {action} ({group.name})')
