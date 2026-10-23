# BoskePOS · UI 2.0 y preventas

Implementación del diseño aprobado el 19 de octubre de 2026.

## Interfaz

Fondo blanco, verde de marca y texto navy. Navegación continua por operación, catálogo/contactos y administración. Dashboard, Productos, Categorías, Clientes, Proveedores, Compras y Ventas utilizan la nueva jerarquía visual. Se mantienen los componentes existentes Ventas del periodo y Salud de inventario con sus datos reales.

Las tablas permiten elegir columnas, guardar la preferencia, alternar densidad y abrir fichas laterales. Clientes y proveedores enlazan a sus operaciones filtradas. Las exportaciones de directorios e historiales corresponden a la página visible; Reportes exporta el período consultado. No se presentan sumas parciales como totales generales.

Montos, porcentajes y cantidades se muestran sin decimales, incluidos gráficos y CSV. Los cálculos y valores almacenados conservan su precisión; no se redondea la contabilidad al guardar. Los identificadores, SKU, RUT y códigos conservan su formato.

## Preventa y cobro

- `/presales`: elegir estación y cliente, buscar o escanear productos, preparar cantidades, revisar cotización del servidor y emitir ticket interno. Borrador guardado por usuario en la sesión del navegador.
- Se crean inicialmente Mesón y Patio. Administración puede agregar estaciones, desactivarlas y configurar vigencia de 0 a 1440 minutos; 0 significa hasta la siguiente medianoche de la zona horaria local.
- El ticket contiene número PV, estación, vendedor, cliente, partidas, total, vencimiento y código de barras Code 128 real. Se puede imprimir desde el navegador. No acredita pago ni reemplaza un documento tributario.
- La emisión no reserva existencias ni registra ingresos. El stock se comprueba al preparar y cobrar.
- `/checkout`: cola compartida con filtros, espera en minutos y advertencia durante los últimos 15 minutos de vigencia. Se actualiza cada 15 segundos. Enter recupera el ticket escaneado.
- Para tomar y cobrar se requiere turno de caja abierto. La toma es exclusiva durante 10 minutos. Cada cajero puede mantener un ticket tomado a la vez. Puede liberarlo; vencida la toma vuelve a estar disponible.
- Si los precios o impuestos cambiaron, el servidor exige revisión explícita antes de continuar. La acción Revisar precios actuales recalcula las partidas y el total.
- El pago registra venta, caja y movimiento de stock en la misma transacción. Claves de idempotencia y bloqueos evitan dobles cobros y sobreventa concurrente. Un ticket pagado no se puede volver a cobrar.
- La cancelación requiere permiso de supervisor y motivo. Para corregir partidas de un ticket emitido, cancelar con motivo y emitir otro; no se modifican silenciosamente sus partidas.
- `/pos` conserva la venta directa y sus ventas en espera, separadas de los tickets de preventa.

## Compras y reposición

`/inventory/replenishment` muestra productos bajo mínimo, proveedor habitual según compras recibidas y cantidades propuestas editables. La selección prepara un borrador de compra para revisar antes de guardarlo; no emite compras automáticamente.

Compras permite recibir por línea cantidades parciales y costos reales. Las diferencias son visibles antes de confirmar. Solo ingresan al inventario las cantidades recibidas, con costo ponderado y registro de cada recepción. Las repeticiones de una misma solicitud no duplican stock. Estados: borrador, recepción parcial, recibida y anulada. Las compras históricas conservan sus cantidades y movimientos.

## Permisos y auditoría

El nuevo rol `cajero` consulta productos/clientes/ventas/tickets y cobra con su turno; no configura estaciones ni emite preventas. Administración configura estaciones y consulta `/audit`. El rol vendedor mantiene sus permisos anteriores y puede emitir preventas; no se revocaron permisos de caja a usuarios existentes.

La auditoría registra usuario, fecha y cambios en productos, categorías, contactos, ventas, compras, tickets, estaciones y recepciones. No registra contraseñas ni PIN. El detalle muestra valores anteriores y nuevos para los campos controlados. No reconstruye cambios anteriores a esta versión.

## Puesta en marcha y validación

Ejecutar las migraciones y `python manage.py seed_roles` en cualquier otro entorno antes de desplegar el frontend. Ambos pasos ya se aplicaron en el entorno local de trabajo.

Validado con 184 pruebas del backend sobre PostgreSQL, incluidas concurrencia de toma/cobro, permisos, idempotencia, caducidad, cambios de precio y recepción parcial. Lint y compilación del frontend correctos. Pasaron 14 pruebas de mascota/POS y 6 del wireframe. Recorrido visual de emisión, recuperación con Enter y pago en una copia aislada de la demo; revisión de las siete secciones y ancho móvil de 390 px. No se registraron ventas de prueba en la base operativa. La impresión física y el lector hardware requieren una comprobación en el equipo de caja.
