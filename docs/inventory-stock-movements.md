# Movimientos de stock

BoskePOS MVP v0.1-R1 mantiene una existencia global por producto. No hay
multiples bodegas ni sucursales en este sprint.

## Tipos

- `entry`: entrada.
- `exit`: salida.
- `positive_adjustment`: ajuste positivo.
- `negative_adjustment`: ajuste negativo.

La cantidad siempre se almacena como positiva. El signo operativo se deriva del
tipo de movimiento.

## Reglas

- Todo ajuste manual debe pasar por `POST /api/inventory/products/{id}/adjust-stock/`.
- El CRUD general de productos no modifica `stock`.
- El usuario responsable se toma desde la sesion autenticada.
- El motivo es obligatorio.
- La operacion usa transaccion atomica y bloquea la fila del producto.
- Si el movimiento dejaria stock negativo, responde `409 Conflict`.
- Los movimientos son de solo lectura desde la API ordinaria.

## Ajustar stock

`POST /api/inventory/products/{id}/adjust-stock/`

```json
{
  "movement_type": "positive_adjustment",
  "quantity": 3,
  "reason": "Correccion de conteo"
}
```

Respuesta `201 Created`:

```json
{
  "id": 1,
  "movement_type": "positive_adjustment",
  "quantity": 3,
  "reason": "Correccion de conteo",
  "stock_before": 5,
  "stock_after": 8,
  "reference": "",
  "created_at": "2026-07-11T12:00:00Z"
}
```

## Historial

`GET /api/inventory/movements/`

Parametros:

- `product`: id del producto.
- `movement_type`: tipo de movimiento.
- `user`: id del usuario.
- `date_from`: fecha inicial `YYYY-MM-DD`.
- `date_to`: fecha final `YYYY-MM-DD`.
- `search`: nombre, SKU, codigo de barras o motivo.
- `ordering`: `created_at`, `-created_at`, `movement_type`, `quantity`.
- `page`
- `page_size`

## Saldo inicial

Para auditar stock existente se provee el comando idempotente:

```powershell
python manage.py create_initial_stock_movements --user-email admin@boskepos.cl
```

El comando crea un movimiento `positive_adjustment` con referencia
`initial-stock-mvp-v0.1-r1` para productos con stock mayor que cero y omite los
que ya tengan ese movimiento inicial.
