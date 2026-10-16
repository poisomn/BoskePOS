# BoskePOS

## Avance de POS caja y stock

Implementación local de POS con alta de cliente, descuentos porcentuales autorizados, sesiones de caja y PIN de administrador, movimientos de stock y primera vista de gestión. Migraciones aplicadas localmente; pendiente aceptación del negocio. Alcance, reglas de dinero, pruebas y uso: [avance operativo](docs/avance-operativo-pos-caja.md). Roadmap de la entrevista: [plan por sprints](docs/plan-mvp-entrevista-dabed-2026-10-15.md).

BoskePOS es un ERP/POS para ferreterias chilenas construido con Django, Django REST Framework, PostgreSQL, React, Vite y Tailwind CSS.

El proyecto parte del MVP v0.2 y contiene una revisión de estabilización **v0.2.1**, validada localmente. La lógica de negocio vive en el backend; el frontend consume la API REST. Esta revisión no representa una puesta en producción ni una certificación tributaria.

## Documentación del proyecto

- [Plan de versiones y criterios de aceptación](docs/roadmap-mvp.md)
- [Arquitectura y modelo de datos](docs/architecture.md)

## Demostración aislada en Windows

Con las dependencias instaladas, ejecutar desde la raíz:

```powershell
.\scripts\start-demo.ps1
```

En otra terminal:

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --strictPort
```

Abrir `http://127.0.0.1:5173`. Las credenciales aleatorias están en `logs/demo-access.json`.
La demo usa exclusivamente `logs/demo.sqlite3`, con catálogo ficticio, y no modifica PostgreSQL.
Detener cada proceso con Ctrl+C. SQLite sirve para demostración; las pruebas de concurrencia requieren PostgreSQL.

## Requisitos

- Python 3.13 (verificado con 3.13.2)
- PostgreSQL
- Node.js 22.12 o posterior y npm
- PowerShell en Windows

## Backend

Crear entorno virtual e instalar dependencias:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Configurar `.env`:

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DB_ENGINE=postgresql
POSTGRES_DB=boskepos_db
POSTGRES_USER=boskepos_user
POSTGRES_PASSWORD=change-me
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=7
```

Aplicar migraciones y datos base:

```powershell
python manage.py migrate
python manage.py seed_roles
python manage.py seed_inventory
```

Crear usuario administrador:

```powershell
python manage.py createsuperuser
python manage.py create_initial_stock_movements --user-email correo-del-administrador
```

`seed_inventory` es para datos de demostración. No ejecutarlo sobre un catálogo real: actualiza los productos del seed. Crear saldos iniciales únicamente durante una carga controlada antes de comenzar operaciones.

Ejecutar backend:

```powershell
python manage.py runserver
```

## Frontend

Instalar dependencias:

```powershell
cd frontend
npm ci
copy .env.example .env
```

Configurar `frontend/.env`:

```env
VITE_API_BASE_URL=/api
```

Ejecutar frontend:

```powershell
npm.cmd run dev
```

En PowerShell, si `npm` queda bloqueado por la politica local de ejecucion, usar `npm.cmd`.

## Validacion

Backend:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --keepdb
python manage.py audit_stock --strict
```

`audit_stock` es de solo lectura y contrasta el Kardex con el saldo almacenado. Ejecutarlo durante una pausa de escrituras; no sustituye el conteo físico. Sobre datos históricos sin movimientos iniciales puede informar diferencias que requieren revisión.

La integración continua en `.github/workflows/quality.yml` ejecuta pruebas sobre PostgreSQL, migraciones, lint, build y auditoría npm. El flujo queda preparado; su ejecución remota depende de publicar los cambios en GitHub.

Frontend:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Migracion limpia

Para validar migraciones sin tocar PostgreSQL local se puede usar SQLite temporal:

```powershell
$tmp = Join-Path $env:TEMP 'boskepos_clean_migration.sqlite3'
if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Force }
$env:DB_ENGINE='sqlite'
$env:SQLITE_NAME=$tmp
python manage.py migrate --noinput
python manage.py seed_roles
python manage.py seed_inventory
if (Test-Path $tmp) { Remove-Item -LiteralPath $tmp -Force }
Remove-Item Env:\DB_ENGINE
Remove-Item Env:\SQLITE_NAME
```

## Endpoints documentados

- `docs/auth-permissions.md`
- `docs/commercial-entities-api.md`
- `docs/dashboard-summary-api.md`
- `docs/inventory-categories-api.md`
- `docs/inventory-products-api.md`
- `docs/inventory-stock-movements.md`
- `docs/purchases-api.md`
- `docs/sales-api.md`

## Roles iniciales

Los roles se implementan mediante Django Groups:

- `administrador`
- `vendedor`
- `encargado_inventario`

Crear o actualizar grupos:

```powershell
python manage.py seed_roles
```

La matriz completa esta documentada en `docs/auth-permissions.md`.

## Restricciones del MVP v0.2.1

No incluye:

- Facturacion electronica.
- Integracion SII.
- Compras con cuentas por pagar.
- Pagos electronicos.
- Multiples bodegas o sucursales.
- Roles avanzados.
- Reportes BI.
- Conciliación automática con terminales bancarios (la conciliación de caja incorporada es manual).
- Cantidades fraccionarias (stock y cantidades son enteros).
- Importación y exportación masiva de catálogo.
- Validación de SLA productivos y piloto con usuarios reales.

## Historial

El cierre histórico de v0.1-R1 está en:

```text
docs/mvp-v0.1-r1-closeout.md
```

El alcance de v0.2 está en `docs/mvp-v0.2-closeout.md`. La planificación vigente propuesta es `docs/roadmap-mvp.md`.

## Operación y seguridad

`GET /api/health/` responde 200 si la base de datos está disponible y 503 si falla; no expone detalles de infraestructura. Login tiene límite por IP de 10 intentos/minuto y refresh de 60/minuto, configurables en `.env`. El caché local no sustituye protección compartida del reverse proxy en producción.

Para un despliegue real: `DEBUG=False`, secreto aleatorio de al menos 50 caracteres, hosts/orígenes explícitos, TLS, backups y restauración ensayada. Las cookies seguras y la redirección HTTPS se habilitan por defecto con `DEBUG=False`. Activar HSTS solo después de validar TLS; subdominios y preload requieren una decisión del despliegue. `python manage.py check --deploy` debe revisarse en ese entorno. El administrador Django permite consultar ventas/compras, pero los cambios transaccionales deben realizarse desde la aplicación.
