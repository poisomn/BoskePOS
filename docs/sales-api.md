# Ventas POS

El backend es la fuente de verdad para totales, estado y stock.

## Estados

- `pending`: venta pendiente.
- `completed`: venta completada. Descuenta stock mediante movimientos de salida.
- `cancelled`: venta anulada. Restaura stock mediante movimientos de entrada.

El POS actual crea ventas completadas directamente para mantener compatibilidad con el flujo ya existente.

## Endpoints

Base URL: `/api/sales/sales/`

- `GET /api/sales/sales/`
- `POST /api/sales/sales/`
- `GET /api/sales/sales/{id}/`
- `POST /api/sales/sales/{id}/complete/`
- `POST /api/sales/sales/{id}/cancel/`

Endpoints POS:

- `GET /api/sales/pos/products/?search=texto`
- `POST /api/sales/pos/cart/quote/`

## Payload de venta

```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 10,
      "quantity": 2
    }
  ]
}
```

`customer_id` puede ser `null` o omitirse para consumidor final.

## Reglas

- El cliente es opcional, pero si se informa debe existir y estar activo.
- Cada producto debe existir y estar activo.
- La venta debe tener al menos una linea.
- Un producto solo puede aparecer una vez en el payload. El frontend consolida escaneos repetidos.
- La cantidad debe ser mayor que cero.
- El backend recalcula `subtotal`, `discount_total`, `tax_total` y `total`.
- La venta completada genera movimientos `exit`.
- La anulacion genera movimientos `entry`.
- La doble completacion o doble anulacion retorna conflicto.
- No se permite stock negativo.

## Filtros

- `status`: `pending`, `completed`, `cancelled`.
- `customer`: id de cliente.
- `user`: id de vendedor.
- `date_from`: fecha inicial.
- `date_to`: fecha final.
- `search`: numero, cliente, RUT, producto o SKU.
- `page`: pagina.
- `page_size`: registros por pagina.

## Errores esperados

- `400`: payload invalido, lineas vacias, producto/cliente invalido, cantidad invalida o stock insuficiente validado como dato de entrada.
- `401`: usuario no autenticado.
- `403`: usuario sin permisos suficientes, cuando existan permisos granulares.
- `404`: venta inexistente.
- `409`: venta ya completada, venta ya anulada o estado incompatible.
- `500`: error inesperado.

## Exclusiones

Este sprint no implementa SII, boletas/facturas tributarias, Transbank, cuentas por cobrar ni multiples bodegas.
