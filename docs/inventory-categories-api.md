# API de categorias de inventario

Base path: `/api/inventory/categories/`

Todos los endpoints requieren autenticacion JWT.

## Listar categorias

`GET /api/inventory/categories/`

Parametros:

- `search`: busqueda por nombre.
- `is_active`: `true` o `false`.
- `ordering`: `name`, `-name`, `created_at`, `-created_at`.
- `page`: numero de pagina.
- `page_size`: cantidad de resultados por pagina, maximo 100.

Respuesta:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Abrasivos",
      "description": "Discos de corte, lijas y accesorios abrasivos.",
      "is_active": true,
      "created_at": "2026-07-10T12:00:00Z",
      "updated_at": "2026-07-10T12:00:00Z"
    }
  ]
}
```

## Crear categoria

`POST /api/inventory/categories/`

```json
{
  "name": "Abrasivos",
  "description": "Discos de corte, lijas y accesorios abrasivos.",
  "is_active": true
}
```

El nombre se normaliza con `trim`. No se permiten nombres vacios ni duplicados
ignorando mayusculas, minusculas y espacios externos.

## Consultar detalle

`GET /api/inventory/categories/{id}/`

## Actualizar categoria

`PUT /api/inventory/categories/{id}/`

`PATCH /api/inventory/categories/{id}/`

## Activar categoria

`POST /api/inventory/categories/{id}/activate/`

Devuelve `200 OK` con la categoria actualizada.

## Desactivar categoria

`POST /api/inventory/categories/{id}/deactivate/`

Devuelve `200 OK` con la categoria actualizada. Los productos asociados no se
modifican.

## Eliminacion

`DELETE /api/inventory/categories/{id}/`

La interfaz principal usa activacion y desactivacion. El endpoint se mantiene por
compatibilidad. Si la categoria tiene productos asociados, responde `409 Conflict`
con un mensaje funcional y no elimina el registro.

## Errores esperados

- `400 Bad Request`: datos invalidos, por ejemplo nombre vacio o duplicado.
- `401 Unauthorized`: credenciales ausentes o invalidas.
- `404 Not Found`: categoria inexistente.
- `409 Conflict`: intento de eliminar una categoria protegida por productos.
