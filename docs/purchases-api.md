# Compras

El backend es la fuente de verdad para estados, subtotales, total e impacto de inventario.

## Estados

- `draft`: borrador editable.
- `confirmed`: compra confirmada. Genera movimientos de entrada y aumenta stock una sola vez.
- `cancelled`: compra anulada. Genera movimientos compensatorios de salida.

Una compra confirmada no puede editar sus lineas mediante el CRUD ordinario. Una compra anulada no puede volver a confirmarse.

## Endpoints

Base URL: `/api/purchases/purchases/`

- `GET /api/purchases/purchases/`
- `POST /api/purchases/purchases/`
- `GET /api/purchases/purchases/{id}/`
- `PATCH /api/purchases/purchases/{id}/`
- `DELETE /api/purchases/purchases/{id}/`
- `POST /api/purchases/purchases/{id}/confirm/`
- `POST /api/purchases/purchases/{id}/cancel/`

`DELETE` solo se permite para borradores. Las compras confirmadas o anuladas se conservan.

## Payload de borrador

```json
{
  "supplier_id": 1,
  "reference": "OC-1001",
  "notes": "Reposicion ferreteria",
  "items": [
    {
      "product_id": 10,
      "quantity": 5,
      "unit_cost": "1290.00"
    }
  ]
}
```

## Reglas

- El proveedor debe existir y estar activo.
- Cada producto debe existir y estar activo.
- La compra debe tener al menos una linea.
- Un producto solo puede aparecer una vez por compra.
- La cantidad debe ser mayor que cero.
- El costo unitario no puede ser negativo.
- El backend calcula `line_total`, `subtotal` y `total`.
- Confirmar usa transaccion atomica y genera movimientos `entry`.
- Anular usa transaccion atomica y genera movimientos `exit`.
- Si una anulacion dejaria stock negativo, se rechaza y no cambia el estado.

## Filtros

- `status`: `draft`, `confirmed`, `cancelled`.
- `supplier`: id de proveedor.
- `date_from`: fecha inicial.
- `date_to`: fecha final.
- `user`: id de usuario.
- `search`: proveedor, RUT, referencia o id.
- `page`: pagina.
- `page_size`: registros por pagina.

## Errores esperados

- `400`: payload invalido, lineas vacias, proveedor/producto invalido, cantidad o costo invalido.
- `401`: usuario no autenticado.
- `403`: usuario sin permisos suficientes, cuando existan permisos granulares.
- `404`: compra inexistente.
- `409`: estado incompatible, doble confirmacion, anulacion imposible o edicion de compra confirmada.
- `500`: error inesperado.
