# BoskePOS · Wireframe 2.0

Propuesta del 19 de octubre de 2026, aprobada por el usuario. La implementación operativa se describe en [UI 2.0 y preventas](ui-v2-y-preventas.md). El contenido siguiente documenta el prototipo original.

Abrir con Vite en ejecución: [Wireframe navegable](http://localhost:5173/wireframe-v2).
No requiere autenticación porque contiene únicamente datos ficticios. Los cambios se guardan en memoria y se reinician al recargar. No llama a las APIs de negocio, registra ventas ni modifica inventario.

## Qué puedes revisar

| Vista | Propuesta |
| --- | --- |
| Dashboard | Encabezado breve, período compacto, cuatro indicadores, tareas accionables y actividad reciente. Reutiliza los componentes existentes de **Ventas del periodo** y **Salud de inventario**, con datos de muestra y sin modificar su implementación. |
| Productos | Tabla legible con identidad, categoría, stock, precio y estado. Búsqueda por nombre/SKU/categoría; filtros de disponibilidad; ficha lateral con ubicación, costo y mínimo. |
| Categorías | Tarjetas para acceso rápido y tabla compacta para administración. Búsqueda y ficha lateral. |
| Clientes | Personas y empresas, identificación y contacto, compras acumuladas y ficha lateral. |
| Proveedores | Directorio con contacto, categorías abastecidas e historial resumido. |
| Compras | Estados separados: borrador, por recibir, recepción parcial y recibida. Ficha con bodega, fecha y propuesta de recepción por línea. |
| Ventas | Historial con documento, cliente, pago, importe y estado; búsqueda, filtros, detalle y CSV. |
| Cajas de preventa | Estaciones Mesón, Patio y Atención empresas. Seleccionar cliente, buscar productos, preparar cantidades y emitir ticket. |
| Caja de venta | Cola compartida, búsqueda por código/cliente/estación, recuperación de ticket, medio de pago, efectivo y vuelto; cobro simulado y cancelación de muestra. |
| Reportes | Indicadores y desglose por medio de pago y producto. Montos, cantidades y porcentajes sin decimales; exportación CSV de muestra. |
| Decisiones y mejoras | Permisos, trazabilidad, stock, vencimiento, código escaneable, accesibilidad y próximos incrementos. |

Los formularios «Nuevo…» son bocetos genéricos que crean registros de muestra al pie de la pantalla. No sustituyen los formularios y validaciones de producción. Los acumulados e indicadores ilustrativos no constituyen balances ni saldos de clientes/proveedores.

## Recorrido sugerido para dar el visto bueno

1. Revisar Dashboard y alternar entre Hoy y Últimos 7 días. Ambos gráficos conservan los componentes actuales.
2. Abrir Productos, buscar «Cemento», filtrar stock y abrir su ficha. Revisar el patrón de tabla y detalle.
3. Visitar Categorías, Clientes, Proveedores, Compras y Ventas. Probar filtros y apertura de fichas.
4. Abrir Cajas de preventa y elegir Patio. Agregar taladro y tornillos. Probar también la pintura sin stock: aparece un error con la mascota.
5. Emitir el ticket; revisar el documento y pulsar «Ver ticket en caja de venta».
6. Simular cobro con débito o efectivo. Si el efectivo es insuficiente, se muestra un error. Al cobrar, pasa a Pagado, baja el contador pendiente y se deshabilita un segundo cobro.
7. Revisar Reportes y Decisiones y mejoras.

## Reglas propuestas para la preventa

- **Estaciones separadas:** vendedor prepara la compra en preventa; cajero confirma el pago en caja de venta. La preventa no cuenta como venta ni ingreso.
- **Ticket identificado:** número, fecha/hora, vendedor, estación, cliente, partidas, cantidades y total con IVA. En el wireframe la hora y el vendedor son de muestra.
- **Cola compartida:** cualquier caja disponible puede atender el ticket. En producción, el servidor debe bloquearlo al tomarlo para impedir atención simultánea.
- **Stock inicial:** propuesta sin reserva de stock, con validación al emitir y al cobrar. Si se requiere garantizar stock mientras el cliente espera, incorporar una reserva transaccional con vencimiento. Esta decisión requiere tu visto bueno.
- **Precio:** conservar el precio de preparación y revalidar al recuperar/cobrar. Si cambió, mostrar la diferencia y pedir confirmación. El wireframe tiene precios estáticos.
- **Estados de producción propuestos:** borrador → pendiente de cobro → tomado por caja → pagado. Alternativas cancelado/vencido. La demo implementa pendiente, pagado y cancelado.
- **Vencimiento:** propuesta al cierre del día, configurable; liberar cualquier reserva si se adopta ese modelo.
- **Edición:** devolver a preventa para modificar, con seguimiento de versiones. Evitar cambios silenciosos en caja.
- **Cobro confiable:** confirmar venta, pago, stock y cierre del ticket en una operación de servidor; usar idempotencia, bloqueo y control de concurrencia.
- **Permisos:** vendedor emite; cajero cobra; supervisor autoriza cancelaciones/descuentos y consulta auditoría. El wireframe muestra el perfil de administración de ejemplo.
- **Documento:** ticket interno con QR o código de barras real al implementar. El patrón de barras del wireframe es ilustrativo y no escaneable. No acredita pago ni sustituye boleta/factura tributaria.

## Cifras sin decimales

En esta propuesta todos los montos, cantidades y porcentajes de presentación usan formato chileno sin decimales: `$49.990`, `120`, `32%`. Los CSV de muestra siguen el mismo criterio.

Al implementar el cambio global, redondear **solo al presentar** en tablas, tarjetas, reportes, gráficos, comprobantes y exportaciones. Mantener la precisión de cálculos, impuestos y datos almacenados. No convertir existencias, descuentos o unidades fraccionarias a enteros en la base de datos. Revisar cómo comunicar la precisión de cantidades vendidas por peso, largo o volumen para no ocultar diferencias operativas.

El formateador global del sistema actual no se cambia antes del visto bueno; así se evita aplicar parcialmente la propuesta a las pantallas vigentes.

## Mejoras adicionales recomendadas

1. Atajos y escáner real para recuperar tickets y atender sin mouse.
2. Reposición sugerida desde productos bajo mínimo, con proveedor habitual y revisión antes de emitir compras.
3. Historial de cambios de precios, stock, tickets y anulaciones con usuario, motivo y fecha.
4. Avisos de tickets próximos a vencer y métricas de espera entre preventa y pago.
5. Recepción por línea con diferencias de cantidad/costo claramente visibles.
6. Preferencias de densidad de tabla y columnas, manteniendo filtros y permisos por rol.

## Alcance técnico

La propuesta vive en `frontend/src/pages/WireframeV2/`. Se añade una ruta independiente `/wireframe-v2`. En Dashboard solo se exportan los dos componentes existentes para reutilizarlos; las pantallas operativas y la lógica de negocio permanecen vigentes.

Validación: lint, compilación, pruebas del modelo de muestra y revisión visual/interactiva en navegador. Las reglas de concurrencia, reserva, precios, emisión tributaria e impresión real pertenecen a la implementación posterior.
