"""Read-only local snapshot of existing table data before additive migrations.

PostgreSQL output is a data snapshot, not a substitute for a full pg_dump backup.
"""
import gzip
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.db import connection, transaction
from django.core.serializers.json import DjangoJSONEncoder

root = Path(__file__).resolve().parent.parent
directory = root / 'logs' / 'backups'
directory.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
if connection.vendor == 'sqlite':
    output = directory / f'pre-operations-{stamp}.sqlite3'
    connection.ensure_connection()
    with sqlite3.connect(output) as target:
        connection.connection.backup(target)
else:
    output = directory / f'pre-operations-{stamp}.data.json.gz'
    snapshot = {'vendor': connection.vendor, 'tables': {}}
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
            for table in connection.introspection.table_names(cursor):
                cursor.execute(f'SELECT * FROM {connection.ops.quote_name(table)}')
                snapshot['tables'][table] = {'columns': [column.name for column in cursor.description], 'rows': cursor.fetchall()}
    with gzip.open(output, 'wt', encoding='utf-8') as stream:
        json.dump(snapshot, stream, cls=DjangoJSONEncoder, ensure_ascii=False)
print(f'Snapshot guardado: {output} ({output.stat().st_size} bytes)')
