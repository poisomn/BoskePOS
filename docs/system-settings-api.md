# System Settings API

La configuracion del negocio centraliza datos operacionales que no deben quedar
quemados en codigo antes de avanzar a v0.3.

## Endpoint

`GET /api/settings/business/`

Retorna la configuracion actual. Si no existe, el backend crea un registro por
defecto.

`PATCH /api/settings/business/`

Actualiza parcialmente la configuracion. Requiere permiso `settings:write`.

## Campos

- `business_name`: nombre comercial.
- `rut`: RUT del negocio. En v0.2 se almacena como texto; validaciones SII se
  abordaran en v0.3.
- `giro`: giro comercial.
- `address`: direccion.
- `city`: ciudad.
- `phone`: telefono.
- `email`: correo.
- `currency`: codigo ISO de 3 letras. Por defecto `CLP`.
- `default_tax_rate`: IVA por defecto para futuros productos o flujos.
- `ticket_footer`: texto inferior para comprobantes internos.
- `updated_at`: fecha de ultima actualizacion.

## Permisos

- `settings:read`: leer configuracion.
- `settings:write`: modificar configuracion.

Solo `administrador` recibe estos permisos en la matriz actual.

## Alcance

Este endpoint no implementa facturacion electronica, DTE ni SII. Su objetivo es
preparar la parametrizacion base para v0.3 sin acoplar esos datos a componentes
frontend o servicios de venta.
