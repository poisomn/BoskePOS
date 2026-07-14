# BoskePOS

BoskePOS es un ERP/POS para ferreterias chilenas construido con Django, Django REST Framework, PostgreSQL, React, Vite y Tailwind CSS.

Este repositorio contiene el cierre del MVP v0.1-R1. La logica de negocio vive en el backend; el frontend consume la API REST.

## Requisitos

- Python 3.13
- PostgreSQL
- Node.js y npm
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
python manage.py create_initial_stock_movements
```

Crear usuario administrador:

```powershell
python manage.py createsuperuser
```

Ejecutar backend:

```powershell
python manage.py runserver
```

## Frontend

Instalar dependencias:

```powershell
cd frontend
npm install
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
```

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

## Restricciones del MVP v0.1-R1

No incluye:

- Facturacion electronica.
- Integracion SII.
- Compras con cuentas por pagar.
- Pagos electronicos.
- Multiples bodegas o sucursales.
- Roles avanzados.
- Reportes BI.

## Cierre v0.1-R1

La auditoria de cierre, validaciones ejecutadas, deuda tecnica y riesgos para v0.2 estan en:

```text
docs/mvp-v0.1-r1-closeout.md
```
