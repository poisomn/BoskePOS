# Dashboard operativo

## Endpoint

`GET /api/dashboard/summary/`

Requiere autenticacion JWT.

## Parametros

- `date`: fecha unica en formato `YYYY-MM-DD`.
- `date_from`: fecha inicial en formato `YYYY-MM-DD`.
- `date_to`: fecha final en formato `YYYY-MM-DD`.
- `limit`: cantidad de registros recientes. Minimo `1`, maximo `20`, por defecto `5`.

No se debe combinar `date` con `date_from` o `date_to`.

El rango maximo permitido es de 31 dias.

## Zona horaria

Los limites diarios se calculan con la zona horaria configurada en Django. No se usan datetimes naive.

## Definiciones

### Ventas del rango

Suma de `Sale.total` para ventas con estado `completed` dentro del rango solicitado.

Excluye:

- `pending`
- `cancelled`

### Cantidad de ventas

Conteo de ventas con estado `completed` dentro del rango solicitado.

### Stock bajo

Productos activos donde:

`stock <= minimum_stock`

### Sin stock

Productos activos donde:

`stock = 0`

### Ventas recientes

Ultimas ventas registradas, limitadas por `limit`.

### Compras recientes

Ultimas compras registradas, limitadas por `limit`.

## Permisos

La respuesta incluye secciones segun permisos:

- `sales:read`: seccion `sales`.
- `inventory:read`: seccion `inventory`.
- `purchases:read`: seccion `purchases`.
- `stock_movements:read`: seccion `stock_movements`.

Si el usuario no tiene permisos para ninguna seccion operativa, la API devuelve `403`.

## Errores

- `400`: fechas invalidas, rango excesivo o `limit` invalido.
- `401`: usuario sin sesion valida.
- `403`: usuario autenticado sin permisos para ninguna seccion.
- `500`: error inesperado.
