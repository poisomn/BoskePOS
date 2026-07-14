# Cierre MVP v0.1-R1

Fecha de auditoria: 2026-07-14

## Resumen ejecutivo

El MVP v0.1-R1 queda en condiciones de cierre tecnico: migraciones aplican desde una base limpia, la suite backend pasa, el frontend compila, y los flujos principales cuentan con contratos API y documentacion.

No se detectaron errores criticos abiertos durante esta auditoria. La deuda tecnica pendiente queda documentada para priorizacion en MVP v0.2.

## Auditoria inicial

### Backend

- Estructura modular bajo `apps/`: correcta para el alcance actual.
- Autenticacion JWT configurada con Simple JWT y blacklist.
- Roles iniciales implementados mediante Django Groups.
- CORS y CSRF configurados desde variables de entorno.
- `.env` real no esta versionado.
- Migraciones sin cambios pendientes.
- Migracion limpia validada con base SQLite temporal.
- Seeds `seed_roles` y `seed_inventory` validados en base limpia.
- Servicios transaccionales presentes en inventario, compras y ventas.
- Consultas principales usan `select_related` y `prefetch_related` donde corresponde.

### Frontend

- React + Vite + Tailwind CSS 4.
- Axios centralizado en `frontend/src/api/http.js`.
- Interceptor JWT con refresh y cierre de sesion ante expiracion.
- No se detectaron llamadas directas dispersas con Axios fuera de la capa HTTP.
- No existen tests automatizados frontend en este cierre.
- Build y lint pasan.
- Dashboard y POS fueron revisados manualmente en navegador.

## Problemas corregidos durante el cierre

### Dashboard: duplicidad de alerta de inventario

Problema:

Un producto con stock `0` aparecia simultaneamente en "Stock bajo" y "Sin stock".

Correccion:

- "Stock bajo" ahora representa productos activos con `stock > 0 AND stock <= minimum_stock`.
- "Sin stock" representa productos activos con `stock = 0`.
- Se actualizaron pruebas y documentacion del endpoint.

Archivos:

- `apps/dashboard/views.py`
- `apps/dashboard/tests.py`
- `docs/dashboard-summary-api.md`

## Validaciones ejecutadas

### Backend

```powershell
python manage.py check
```

Resultado: OK.

```powershell
python manage.py makemigrations --check --dry-run
```

Resultado: OK, sin cambios pendientes.

```powershell
python manage.py test --keepdb
```

Resultado: OK, 111 pruebas ejecutadas.

### Migracion limpia

Se ejecuto migracion sobre base SQLite temporal:

```powershell
python manage.py migrate --noinput
python manage.py seed_roles
python manage.py seed_inventory
```

Resultado:

- Migraciones aplicadas correctamente.
- Roles iniciales creados correctamente.
- Seed de inventario completado correctamente.

### Frontend

```powershell
npm.cmd run lint
npm.cmd run build
```

Resultado: OK.

## Prueba manual realizada

### Dashboard

- Carga con usuario autenticado.
- KPIs visibles.
- Filtro de 7 dias muestra todos los dias del rango.
- Bar chart usa serie diaria real.
- Pie chart usa conteos reales de inventario.
- Alertas de inventario ya no duplican productos sin stock en stock bajo.

### POS

- Busqueda por SKU probada con `LUB-MAK-002`.
- Producto agregado al carrito.
- Cotizacion recalculada desde backend.
- Subtotal y total visibles.
- Se conserva flujo de venta sin registrar metodo de pago, porque no existe contrato backend para ese dato en el MVP.

## Contratos y endpoints documentados

- Autenticacion y permisos: `docs/auth-permissions.md`
- Dashboard: `docs/dashboard-summary-api.md`
- Categorias: `docs/inventory-categories-api.md`
- Productos: `docs/inventory-products-api.md`
- Movimientos de stock: `docs/inventory-stock-movements.md`
- Clientes y proveedores: `docs/commercial-entities-api.md`
- Compras: `docs/purchases-api.md`
- Ventas: `docs/sales-api.md`

## Deuda tecnica pendiente

### Alta prioridad para v0.2

- Agregar pruebas automatizadas frontend para flujos criticos: login, POS, compras, productos y dashboard.
- Definir si v0.2 mantendra una unica bodega o introducira multiples bodegas antes de evolucionar inventario.
- Definir contrato backend para metodo de pago antes de representar botones funcionales en POS.

### Media prioridad

- Unificar gradualmente componentes visuales legacy con componentes shadcn/Bklit donde aporte consistencia real.
- Revisar si `reports` debe permanecer como app vacia o esperar hasta el sprint real de reportes.
- Agregar documentacion de despliegue productivo cuando exista ambiente objetivo.
- Revisar politica de `DEBUG=False`, `ALLOWED_HOSTS`, HTTPS y cookies seguras para produccion.

### Baja prioridad

- Evaluar normalizacion de mensajes de error en una capa comun cuando crezca la API.
- Agregar pruebas de accesibilidad frontend con herramienta automatizada cuando se incorpore infraestructura de testing.
- Revisar bundle splitting si el dashboard sigue creciendo con graficos.

## Riesgos para MVP v0.2

- Multi-bodega cambia el modelo de stock; no debe agregarse sin decision de dominio.
- Pagos y caja requieren contrato transaccional separado de ventas.
- Facturacion electronica y SII no deben mezclarse con el cierre operacional del POS.
- Reportes avanzados pueden requerir endpoints agregados especificos, no calculos en React.

## Estado

MVP v0.1-R1 listo para cierre tecnico, sujeto a revision final del usuario.
