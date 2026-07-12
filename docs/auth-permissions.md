# Autenticacion y permisos

BoskePOS utiliza JWT mediante `djangorestframework-simplejwt`.

## Endpoints

- `POST /api/accounts/login/`
- `POST /api/accounts/token/refresh/`
- `GET /api/accounts/me/`
- `POST /api/accounts/logout/`

`logout` invalida el refresh token usando blacklist.

## Configuracion JWT

- Access token: definido por `JWT_ACCESS_TOKEN_MINUTES`, por defecto 60 minutos.
- Refresh token: definido por `JWT_REFRESH_TOKEN_DAYS`, por defecto 7 dias.
- Tipo de header: `Bearer`.
- Rotacion de refresh: desactivada por ahora.
- Blacklist: activa para logout y compatible con rotacion futura.

## Roles

Los roles se implementan con Django Groups. No se agrego un campo rigido al modelo `User`.

Crear grupos:

```bash
python manage.py seed_roles
```

El comando es idempotente.

## Matriz inicial

Administrador (`administrador`)

- Inventario completo.
- Ajustes de stock.
- Movimientos de stock.
- Clientes.
- Proveedores.
- Compras, incluidas anulaciones.
- Ventas, incluidas anulaciones.
- Reportes sensibles cuando existan.

Vendedor (`vendedor`)

- Consultar inventario activo.
- Gestionar clientes.
- Operar POS y ventas.
- Completar ventas.
- Consultar historial de ventas.
- No puede ajustar stock.
- No puede anular ventas.
- No puede ver costos.

Encargado de inventario (`encargado_inventario`)

- Gestionar categorias y productos.
- Ver costos.
- Ajustar stock.
- Ver movimientos.
- Gestionar proveedores.
- Gestionar compras.
- Confirmar compras.
- No puede operar ventas.
- No puede anular compras, reservado inicialmente al administrador.

## Permisos base

- `inventory:read`
- `inventory:write`
- `inventory:adjust_stock`
- `inventory:view_costs`
- `stock_movements:read`
- `customers:read`
- `customers:write`
- `suppliers:read`
- `suppliers:write`
- `purchases:read`
- `purchases:write`
- `purchases:confirm`
- `purchases:cancel`
- `sales:read`
- `sales:write`
- `sales:complete`
- `sales:cancel`
- `reports:sensitive`

Las clases de permiso autorizan acciones explicitas. Cualquier accion no registrada se rechaza por defecto.

## Permisos de aplicacion expuestos a frontend

El endpoint `/api/accounts/me/` devuelve:

- `roles`
- `permissions`

Estos permisos se usan solo para adaptar la interfaz. La seguridad real se aplica en backend.

## Codigos HTTP

- `401`: no hay sesion valida, token ausente o token invalido.
- `403`: usuario autenticado sin autorizacion.

El frontend intenta renovar access token una sola vez ante `401`. Si el refresh falla, limpia la sesion. Un `403` no cierra la sesion.
