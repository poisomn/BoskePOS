# MVP v0.2 Closeout

## Estado

BoskePOS v0.2 queda preparado como base operativa previa a v0.3.

## Incluido

- POS profesional con lector HID, ventas suspendidas, descuentos, observaciones,
  medios de pago simples, recibido y vuelto.
- Comprobante interno con cajero, detalle de abono, IVA incluido y datos del
  negocio desde configuracion.
- Ventas transaccionales con movimientos de salida, anulacion auditable y stock
  no negativo.
- Compras/recepcion manual con borradores, confirmacion, movimientos de entrada,
  anulacion compensatoria y costo promedio ponderado.
- Inventario con Kardex basado en `StockMovement`, filtros por tipo, fecha,
  busqueda y referencia.
- Configuracion central del negocio mediante `system_settings`.
- Permisos por rol aplicados a configuracion, ventas, compras e inventario.

## Decisiones

- Una sola bodega para v0.2.
- `Product.stock` se mantiene como saldo operativo.
- `StockMovement` es la fuente auditable del Kardex.
- El IVA de venta se calcula como IVA incluido, no se suma sobre el precio final.
- Pago mixto queda fuera de v0.2 porque requiere modelo de pagos por venta.
- Facturacion electronica, DTE y SII quedan fuera de v0.2.

## Pendiente para v0.3

- Validacion tributaria formal de datos de empresa.
- Modelos y flujos de DTE.
- Folios, CAF, firma, envio y consulta SII.
- Boleta/factura tributaria oficial.
- Notas de credito y guias de despacho.
- Eventual modelo de pagos multiples si se habilita pago mixto.
