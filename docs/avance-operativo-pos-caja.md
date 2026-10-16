# Avance operativo de POS caja y stock

Implementación del 15 de octubre de 2026. Código y migraciones disponibles localmente; pendiente la aceptación de usuarios de El Boske. Este avance ejecuta partes de varios sprints y no declara terminados los hitos del roadmap completo.

## Funcionalidad disponible

- POS con búsqueda única por nombre, SKU o barcode, carrito en tabla, resumen lateral en escritorio, foco recuperado y atajos F4 buscar, F2 cobrar y F8 limpiar. En pantallas menores la tabla permite desplazamiento horizontal y el resumen pasa debajo del carrito.
- Cobro en ventana con efectivo, débito, crédito o transferencia; monto exacto y billetes frecuentes; cálculo de vuelto; bloqueo por stock insuficiente. El registro de medios es manual, sin comunicación con terminales bancarios.
- Cliente final opcional, búsqueda remota de clientes y alta desde el POS reutilizando las validaciones de clientes, sin perder el carrito.
- IVA y descuentos sin ceros decimales añadidos. Se mantienen tasas fraccionarias preexistentes, sin redondear sus valores para ocultarlas. Los descuentos nuevos del POS se ingresan como porcentajes enteros.
- Motivo obligatorio para descuentos. Límite inicial configurable de vendedor de 5%; valores superiores requieren PIN de administrador activo. Administradores pueden aplicar descuentos con su permiso y motivo. Monto y porcentaje no se acumulan sobre la misma línea.
- Apertura con caja y fondo por cajero; una caja abierta por cajero y una sesión abierta por caja. Cobros y anulaciones requieren una sesión abierta.
- Ingresos y retiros de efectivo con motivo, control de saldo esperado, resumen por medio, conteo contrastado, diferencia y observación obligatoria si no cuadra.
- Cierre con PIN personal de administrador, identidad del cajero que contó y del administrador que autorizó. Resumen congelado al cerrar; movimientos posteriores no modifican el cierre anterior.
- Historial de sesiones con filtros por fecha, ID de cajero e ID de caja; diferencias de efectivo netas, faltantes y sobrantes separados. El detalle conserva también diferencias por los otros medios.
- Gestión de usuarios y roles dentro de la aplicación. El administrador configura únicamente su propio PIN presentando su contraseña actual. El PIN se almacena con hash y no se devuelve por API; cinco fallos bloquean la autorización durante quince minutos. Cambiar el rol o desactivar al administrador revoca su PIN.
- No se permite desactivar una caja abierta ni desactivar/quitar acceso a caja a un usuario con turno abierto.
- Retiro interno y merma como tipos de movimiento, con usuario, motivo y referencia opcional; incorporados al Kardex y auditoría de saldos. Los permisos actuales de ajuste se conservan.
- Consulta por producto de compras confirmadas y ventas completadas mensuales, doce meses por año, stock y mínimo actuales. Abrir desde el nombre del producto en Inventario, con permiso de movimientos.
- Vendedor original y cajero de cobro conservados por separado; el comprobante los distingue. El costo aplicado y la tasa se guardan por línea. Las ventas históricas sin costo permanecen sin costo, sin reconstruirlo desde el catálogo actual.
- Dashboard con ticket promedio, clientes identificados únicos y transacciones anónimas; acceso a cajas y reportes.
- Primera pantalla de Reportes con período, ventas, transacciones, ticket, clientes, desglose por medio, cajeros, productos, categoría y serie diaria. Usuarios autorizados ven utilidad y valorización de la bodega operativa única. No hay separación física de saldos por bodega.

## Dinero redondeo y costos

El cálculo interno conserva dos decimales. El importe final de las nuevas ventas se redondea al peso más cercano, con medios pesos hacia arriba (`ROUND_HALF_UP`). Se guarda `rounding_adjustment` en la venta y en la línea de mayor importe que absorbe la diferencia. El IVA de esa línea se recalcula sobre su importe final; la suma de las líneas coincide con el total. El resumen y el comprobante muestran el ajuste explícitamente. Ejemplo: $1.990 con 5% de descuento produce descuento de $99,50, ajuste de +$0,50 y total exigible de $1.891. Recibir $5.000 produce vuelto de $3.109. Fondo, movimientos y efectivo contado/recibido se expresan en pesos enteros.

Esta regla de precisión al peso no implementa una política adicional de redondeo de efectivo a múltiplos de diez. La integración tributaria y sus reglas documentales siguen fuera de este avance. Los pendientes históricos consumidos por el POS se recalculan antes de cobrar; no se reescriben ventas completadas antiguas.

El costo histórico capturado es el costo unitario registrado en producto al cobrar. Debe mantenerse como costo neto para interpretar correctamente la utilidad sin IVA. No se implementó un motor nuevo de costo promedio ponderado ni reparto de fletes. Una venta pendiente toma el costo vigente al completarse. Cambiar el costo actual después no altera la utilidad de esa venta.

Los reportes consultan ventas completadas y actualmente no anuladas dentro de la fecha local de finalización. Son indicadores operativos del estado vigente, no un libro contable de devoluciones por fecha de devolución. Una anulación registra una reversa por el medio original en el turno del operador autorizado que la realiza; si no tiene suficiente efectivo, debe registrar el ingreso correspondiente antes. La devolución bancaria debe contrastarse manualmente.

Utilidad bruta = ingreso después de descuentos y sin IVA menos costo histórico vendido. Si falta costo en alguna línea, costo total/utilidad/margen se presentan como no disponibles. El margen con denominador cero no aplica. Valorización usa todos los productos con saldo positivo al momento de consulta, incluidos los inactivos que todavía mantienen stock: costo registrado actual y venta potencial neta actual. No representa una valorización histórica a fecha seleccionada ni ingreso realizado.

## Integridad y permisos

POST de creación acepta `idempotency_key` UUID, usado por el nuevo POS y conservado con el carrito en `sessionStorage` por usuario para reintentos. La combinación usuario/clave es única y el contenido se contrasta con una huella; la clave repetida con contenido diferente se rechaza. Completar pendientes tiene una clave de cobro separada y conserva vendedor y cajero. Los clientes antiguos de API sin clave conservan compatibilidad, pero no reciben garantía de idempotencia de creación.

Las operaciones de cobro, apertura, movimiento y cierre usan transacciones y bloqueos de filas. El cierre y el cobro concurrentes quedan serializados por cajero; el producto se bloquea antes de descontar stock. Las autorizaciones verifican rol y estado vigentes en servidor. Los fallos del PIN se guardan fuera de la transacción de negocio que puede rechazarse.

Solo administradores administran usuarios/cajas y parámetros del negocio. Vendedores/cajeros consultan sus propias sesiones; administradores pueden consultar el historial completo. Las consultas de utilidad/valorización se omiten para quien carece de `reports:sensitive`. El costo histórico no se expone en la API de detalle de venta para el vendedor.

## Puesta en marcha local

Las migraciones aditivas se aplicaron a PostgreSQL local y a la demo SQLite. Se creó una Caja principal sin abrir automáticamente turnos ni asignar PIN a cuentas reales.

1. Entrar como administrador y abrir Usuarios desde Configuración o el menú.
2. Configurar el PIN personal de cuatro dígitos con la contraseña actual.
3. Revisar el límite de descuento de vendedor en Datos del negocio.
4. Crear las cajas adicionales que se necesiten; cada cajero abre su propio turno y cuenta el fondo.
5. Validar el recorrido de venta y arqueo con datos de prueba antes de usarlo en operación real.

Para otra instalación: `python manage.py migrate --noinput`. Las migraciones no rellenan cajero ni costo de ventas históricas.

Antes de migrar se guardaron en `logs/backups/` una copia completa del archivo SQLite de demo y una instantánea de datos de las tablas PostgreSQL. La instantánea JSON comprimida de PostgreSQL no es un backup completo de esquema/secuencias ni reemplaza `pg_dump` o un respaldo productivo ensayado. No se ha certificado restauración productiva.

## Verificación realizada

- Suite completa: 166 pruebas aprobadas sobre PostgreSQL. Incluye las pruebas previas de ventas e inventario, con apertura explícita añadida a sus fixtures.
- Cuatro escenarios nuevos de concurrencia PostgreSQL: última unidad entre cajeros distintos; apertura simultánea de una caja; misma clave de venta concurrente; cobro frente a cierre.
- Después de los últimos ajustes de protección y dashboard, 33 pruebas afectadas de caja/dashboard aprobadas.
- Verificación posterior de usuarios privilegiados: 20 pruebas de caja aprobadas, incluyendo el caso adicional que impide a un administrador de aplicación apropiarse de una cuenta superusuario.
- Cinco pruebas existentes de estados de mascota aprobadas; extracción del componente de resultados conserva su comportamiento.
- Lint y build del frontend; `manage.py check` y migraciones sin cambios pendientes.
- Navegador sobre SQLite demo: apertura con $15.000, cliente creado desde carrito, venta de disco de $1.990 con descuento de 5%, pago con $5.000, vuelto de $3.109, cierre con $16.891 y diferencia cero autorizado por PIN, y reporte de esa venta con costo histórico. Los datos son sintéticos y no se registraron ventas de prueba en PostgreSQL de trabajo.

Captura: `output/operations/pos-operativo.jpg`. Demo temporal de revisión: `http://127.0.0.1:5174/pos`, con backend en 8001. El desarrollo habitual conserva 5173/8000. Para usar otro backend de desarrollo se admite `VITE_PROXY_TARGET` al iniciar Vite.

## Trabajo que conserva su lugar en los sprints

Este avance no incluye exportación Excel, pago mixto, integración con terminales/SII, multibodega, pedidos pendientes, motor de reposición ni importador XML. Tampoco completa el módulo diferenciado de preventa con ticket escaneable: mejora la pausa existente y conserva la autoría al recuperar/cobrar. La búsqueda muestra hasta veinte coincidencias y las ventas en espera hasta cien; falta navegación de ese listado para volúmenes mayores.

El reporte incorpora una primera serie diaria en barras y tablas, no todos los gráficos finales solicitados. Ventas por hora están disponibles en su API, pendientes de la presentación final. Tipo de venta directa/preventa necesita el módulo de preventas separado. El arqueo actual es asistido, con esperado consultable; un cierre ciego requiere validar ese cambio de procedimiento.

El piloto con usuarios, cantidades fraccionarias, método formal de valorización/reversas de compras, desempeño a gran escala y recuperación productiva siguen pendientes. Vincular este avance al roadmap y revisar cada criterio de aceptación antes de mover sus tarjetas a Hecha.
