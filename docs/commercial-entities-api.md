# Clientes y proveedores

BoskePOS almacena el RUT como texto canonico en formato `12345678-5`.
El backend acepta formatos con puntos, espacios, guion y digito `k` o `K`, pero siempre normaliza antes de guardar.

## Reglas de RUT

- Se eliminan puntos y espacios.
- El digito verificador se guarda en mayuscula.
- El digito verificador se valida con modulo 11.
- El RUT vacio se guarda como `null`.
- La unicidad se aplica dentro de cada entidad: clientes por un lado y proveedores por otro.

## Clientes

Base URL: `/api/customers/customers/`

Endpoints:

- `GET /api/customers/customers/`
- `POST /api/customers/customers/`
- `GET /api/customers/customers/{id}/`
- `PATCH /api/customers/customers/{id}/`
- `PUT /api/customers/customers/{id}/`
- `DELETE /api/customers/customers/{id}/`
- `POST /api/customers/customers/{id}/activate/`
- `POST /api/customers/customers/{id}/deactivate/`

Parametros de listado:

- `search`: busca por nombre, RUT, correo o telefono.
- `is_active`: `true` o `false`.
- `ordering`: `name`, `rut`, `created_at` o `updated_at`.
- `page`: numero de pagina.
- `page_size`: cantidad de registros por pagina.

Payload de creacion o edicion:

```json
{
  "name": "Cliente Comercial",
  "rut": "12.345.678-5",
  "email": "cliente@example.com",
  "phone": "+56912345678",
  "address": "Av. Principal 123",
  "city": "Santiago",
  "is_active": true
}
```

## Proveedores

Base URL: `/api/suppliers/suppliers/`

Endpoints:

- `GET /api/suppliers/suppliers/`
- `POST /api/suppliers/suppliers/`
- `GET /api/suppliers/suppliers/{id}/`
- `PATCH /api/suppliers/suppliers/{id}/`
- `PUT /api/suppliers/suppliers/{id}/`
- `DELETE /api/suppliers/suppliers/{id}/`
- `POST /api/suppliers/suppliers/{id}/activate/`
- `POST /api/suppliers/suppliers/{id}/deactivate/`

Parametros de listado:

- `search`: busca por razon social, RUT, correo o telefono.
- `is_active`: `true` o `false`.
- `ordering`: `name`, `rut`, `created_at` o `updated_at`.
- `page`: numero de pagina.
- `page_size`: cantidad de registros por pagina.

Payload de creacion o edicion:

```json
{
  "name": "Proveedor Industrial",
  "rut": "76.543.210-3",
  "email": "ventas@proveedor.cl",
  "phone": "+56223456789",
  "address": "Av. Industrial 100",
  "city": "Santiago",
  "is_active": true
}
```

## Errores esperados

- `400`: nombre vacio, RUT invalido, RUT duplicado, correo invalido o payload incorrecto.
- `401`: usuario no autenticado.
- `403`: usuario autenticado sin autorizacion suficiente, cuando existan permisos granulares.
- `404`: entidad inexistente.
- `500`: error inesperado del servidor.
