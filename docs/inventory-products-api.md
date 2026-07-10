# API de productos de inventario

Base path: `/api/inventory/products/`

Todos los endpoints requieren autenticacion JWT.

## Listar productos

`GET /api/inventory/products/`

Parametros:

- `search`: busqueda por nombre, SKU o codigo de barras.
- `category`: id de categoria.
- `is_active`: `true` o `false`.
- `low_stock`: `true` para productos con `stock <= minimum_stock`.
- `out_of_stock`: `true` para productos con `stock = 0`.
- `sku`: filtro exacto por SKU. Se normaliza a mayusculas.
- `barcode`: filtro exacto por codigo de barras.
- `ordering`: `name`, `-name`, `sku`, `-sku`, `stock`, `-stock`, `sale_price`, `-sale_price`, `created_at`, `-created_at`, `updated_at`, `-updated_at`.
- `page`: numero de pagina.
- `page_size`: cantidad de resultados por pagina, maximo 100.

La respuesta es paginada:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "category": 1,
      "category_detail": {
        "id": 1,
        "name": "Abrasivos",
        "description": "Discos de corte y lijas.",
        "is_active": true,
        "created_at": "2026-07-10T12:00:00Z",
        "updated_at": "2026-07-10T12:00:00Z"
      },
      "name": "Disco de Corte Metal 4.5",
      "sku": "AB001",
      "barcode": "781200000001",
      "brand": "3M",
      "unit": "unidad",
      "location": "A-01-01",
      "image": null,
      "description": "Disco abrasivo para corte de acero.",
      "cost_price": "950.00",
      "sale_price": "1990.00",
      "tax_rate": "19.00",
      "stock": 24,
      "minimum_stock": 6,
      "is_active": true,
      "created_at": "2026-07-10T12:00:00Z",
      "updated_at": "2026-07-10T12:00:00Z"
    }
  ]
}
```

## Crear producto

`POST /api/inventory/products/`

```json
{
  "category": 1,
  "name": "Disco de Corte Metal 4.5",
  "sku": "AB001",
  "barcode": "781200000001",
  "brand": "3M",
  "unit": "unidad",
  "location": "A-01-01",
  "description": "Disco abrasivo para corte de acero.",
  "cost_price": "950.00",
  "sale_price": "1990.00",
  "tax_rate": "19.00",
  "stock": 24,
  "minimum_stock": 6,
  "is_active": true
}
```

Reglas:

- `name` se normaliza con `trim` y no puede quedar vacio.
- `sku` es obligatorio, se normaliza con `trim` y mayusculas, y debe ser unico.
- `barcode` es opcional. Si llega vacio se almacena como `null`; si llega informado se normaliza con `trim` y debe ser unico.
- `category` puede ser `null`, pero si se informa debe existir y estar activa.
- `cost_price`, `sale_price`, `tax_rate`, `stock` y `minimum_stock` no pueden ser negativos.
- `created_at` y `updated_at` son de solo lectura.

## Consultar detalle

`GET /api/inventory/products/{id}/`

## Actualizar producto

`PUT /api/inventory/products/{id}/`

`PATCH /api/inventory/products/{id}/`

## Activar producto

`POST /api/inventory/products/{id}/activate/`

Devuelve `200 OK` con el producto actualizado.

## Desactivar producto

`POST /api/inventory/products/{id}/deactivate/`

Devuelve `200 OK` con el producto actualizado.

## Errores esperados

- `400 Bad Request`: datos invalidos, SKU duplicado, codigo de barras duplicado, categoria inactiva o valores negativos.
- `401 Unauthorized`: credenciales ausentes o invalidas.
- `404 Not Found`: producto inexistente.
