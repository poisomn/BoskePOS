# Evolución propuesta de BoskePOS

Fecha: 16 de septiembre de 2026. Esta propuesta parte del MVP v0.2. Las versiones posteriores son backlog recomendado, no funcionalidades entregadas ni fechas comprometidas. Se prioriza la operación confiable antes de incorporar integración tributaria.

## Versiones y condiciones de salida

| Versión | Propósito | Cambios principales | Criterio de salida |
|---|---|---|---|
| v0.2 | Base existente | POS, compras, Kardex, configuración y roles | Base auditada en commit `6dbb13c` |
| v0.2.1 | Estabilización realizada | Integridad, filtros, dashboard, recibos por rol, cancelación de solicitudes, dependencias, demo y evidencias | 139 pruebas PostgreSQL aprobadas; lint/build; recorrido técnico de POS |
| v0.3 | Operación controlada | Idempotencia, política de valorización/reversa, redondeo CLP, caja básica, respaldo/restauración, logs y staging | Reintentar no duplica venta; apertura/cierre conciliado; restauración medida; cero defectos bloqueantes del piloto |
| v0.4 | Inventario utilizable a escala | Importación/exportación CSV, validación previa sin escritura, errores por fila, cantidades decimales por unidad, búsqueda paginada y accesibilidad | Importación atómica/idempotente; ningún movimiento perdido; UAT con catálogo y periféricos representativos |
| v0.5 | Gestión comercial | Pagos múltiples si se validan, devoluciones parciales, reportes exportables y márgenes sobre costo histórico | Pagos suman total; devolución referencia venta; reportes conciliados con operaciones |
| v0.6 | Integración tributaria acotada | Evaluación proveedor/directa, documentos y estados, ambientes de prueba, gestión de errores y trazabilidad | Requisitos de la alternativa elegida verificados, pruebas de integración y autorización aplicable antes de emisión real |
| v1.0 | Operación aceptada | Piloto completado, manuales, soporte, continuidad y despliegue revisado | Aceptación escrita; respaldo/restauración; métricas representativas; defectos críticos cerrados |

Multibodega, sucursales, sincronización offline y BI quedan fuera de esta secuencia base. Solo priorizarlos si la investigación con el negocio demuestra mayor valor que los riesgos pendientes.

## Backlog prioritario con aceptación verificable

### P01 Idempotencia de ventas para v0.3

Como cajero, quiero recuperar el resultado de un cobro cuyo envío quedó incierto para no registrar dos ventas. El cliente crea una clave una sola vez; el servidor guarda resultado y huella del payload en la misma transacción. Misma clave y mismo payload devuelven la misma venta; misma clave con otro payload produce 409. Probar doble clic, dos solicitudes paralelas, timeout después del commit y reapertura del navegador. Estimación orientativa: 3 a 5 días de equipo, sujeta a diseño.

### P02 Valorización consistente para v0.3

Persistir el costo histórico aplicado a cada movimiento relevante y definir cómo revertir una compra cuando existen hechos posteriores. El saldo físico y su valor deben conciliarse antes y después. No restaurar ciegamente un costo anterior si hubo otras compras o ventas. Incluir ejemplos de stock cero, compras consecutivas, devolución y corrección. Estimación: 4 a 7 días; depende de acordar reglas con el propietario.

### P03 Caja y redondeo para v0.3

Agregar apertura, fondo inicial, ingresos/egresos justificados y cierre por responsable. Definir importe exigible, vuelto y política de redondeo CLP con ejemplos aprobados. La diferencia de caja debe calcularse a partir de eventos, no editarse para cuadrar. El rótulo previo de turno activo no acreditaba un módulo de turnos; ahora la pantalla indica sesión iniciada. Estimación: 5 a 8 días.

### P04 Continuidad y observabilidad para v0.3

Entorno de staging con PostgreSQL, HTTPS, proceso supervisado, caché/rate limit compartido, health check monitorizado, registro de errores sin tokens y respaldo fuera del host. Restaurar en otra base y medir RPO/RTO. El archivo de backup por sí solo no prueba recuperación. Estimación: 3 a 5 días más una ventana de ensayo.

### P05 Catálogo e inventario para v0.4

Importación en dos fases: vista previa con errores y confirmación explícita del lote válido. Definir SKU/barcode normalizados, CSV con UTF-8, límites de tamaño y manejo de fórmulas al exportar. Ajustes de stock siempre generan movimientos. Migrar cantidades a decimal con escala por unidad y probar redondeos. Estimación: 6 a 10 días para un alcance inicial; no debe agruparse sin priorización si el equipo tiene tiempo parcial.

## Secuencia de trabajo sugerida

| Iteración | Objetivo | Responsable funcional | Evidencia |
|---|---|---|---|
| 1 | Revisar v0.2.1 y acordar reglas de importes/costos | Equipo y propietario | Backlog aprobado, acta, demostración |
| 2 | Idempotencia y valorización | Backend con revisión cruzada | Pruebas de reintentos, concurrencia y saldo valorizado |
| 3 | Caja y staging | Backend, frontend y operación | Flujo de caja; restauración medida |
| 4 | UAT y correcciones de v0.3 | Usuarios por rol y equipo | Casos ejecutados, tiempos y aceptación |
| 5 | Alcance de v0.4 | Inventario y UX | Importación de muestra y pruebas de cantidades |

Usar iteraciones de una o dos semanas según disponibilidad real. Las estimaciones anteriores no se suman como compromiso contractual: hay dependencias, revisión y capacidad compartida. El cronograma académico debe incorporar fechas del ramo, horas disponibles y responsables nominales acordados por el equipo.

## Definición de terminado

Cada historia necesita comportamiento observable, API y UI coherentes cuando correspondan, pruebas de caminos críticos y de error, permisos, documentación actualizada y evidencia vinculada a una versión. Para historias operativas, añadir aceptación de un usuario del rol afectado. No cerrar un MVP porque solo compila o porque todas sus pantallas existen.
