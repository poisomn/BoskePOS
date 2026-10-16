# Propuesta de evolución de BoskePOS y roadmap de trabajo

Fecha de elaboración: 15 de octubre de 2026. Estado: propuesta para priorización, sin cambios funcionales implementados por este documento.

Propongo comenzar por el recorrido completo de venta y caja: encontrar el producto, confirmar disponibilidad, cobrar una sola vez, registrar el movimiento y cerrar el turno con trazabilidad. Después ampliar el análisis de compras, ventas y stock; finalmente incorporar los reportes de rentabilidad sobre costos históricos verificables.

El roadmap incluye el alcance solicitado, pero distingue una primera entrega operativa de las ampliaciones posteriores. El calendario es relativo: no hay fecha de inicio ni disponibilidad del equipo confirmadas.

## Evidencia y alcance

Fuentes utilizadas:

- **E1 Entrevista**: `C:/Users/chris/Desktop/Transcripción de Entrevista Roberto Torrejon Jefe de Local DABED La Serena.docx`.
- **E2 Guía con apuntes**: `C:/Users/chris/Downloads/Guia_Entrevista_DABED_BoskePOS_v3.docx`.
- **E3 Referencias visuales**: las 17 imágenes adjuntas de apertura, POS, categorías, cliente, pago, pausa, preventa, cierre y configuración de UVO.
- **E4 Solicitud del usuario**: prioridades funcionales y listado de dashboard y reportes del 15 de octubre de 2026.
- **E5 Código inspeccionado**: ventas, inventario, permisos, dashboard, reportes, configuración y POS en este repositorio; además de `docs/roadmap-mvp.md`.

Las instrucciones de conducción de entrevista que aparecen en la guía son contenido de la fuente. Las preguntas sin respuesta no acreditan necesidades confirmadas. Las prácticas descritas por Roberto son evidencia de DABED y recomendaciones para estudiar; las imágenes son referencias de interacción. La selección para El Boske debe considerar su operación, y las recomendaciones de este documento se identifican como propuestas.

La guía indica una entrevista el 14 de octubre, mientras el mensaje recibido el 15 la describe como realizada hoy. Confirmar la fecha efectiva al cerrar el acta; se usa aquí el 15 solo como fecha de elaboración del plan.

## Qué haría primero

1. Acordar las reglas que afectan dinero y stock, y definir un guion de venta representativo con el equipo y usuarios de El Boske.
2. Prototipar el POS conservando la identidad de BoskePOS: búsqueda siempre accesible, carrito legible y total/cobro visibles. Validar el recorrido con teclado y lector.
3. Implementar esa mejora junto con cobro sin duplicados, porcentajes claros y apertura/cierre de caja autorizado.
4. Completar la vista por producto de compras mensuales, ventas mensuales, existencias y movimientos, que es la necesidad más repetida por Roberto.

No adoptaría automáticamente la venta con stock negativo. Roberto la defiende por razones comerciales; el equipo relata que en El Boske es parte del problema actual, y el backend ya impide vender cantidades superiores al stock. Recomiendo conservar ese bloqueo para ventas con entrega inmediata y estudiar pedidos pendientes como una función distinta. Un pedido pendiente no equivale a stock disponible ni a mercadería entregada.

## Diagnóstico de la base existente

Inspección estática del código; no constituye una nueva ejecución de pruebas ni certificación de comportamiento en producción.

| Área | Base observada | Trabajo propuesto |
|---|---|---|
| POS | Búsqueda/lector, carrito, selección de cliente, pago único, efectivo/vuelto y ventas pendientes | Mejorar eficacia; alta de cliente dentro del flujo; descuentos porcentuales y autorizaciones; idempotencia |
| Inventario | SKU/barcode, categoría, marca y ubicación como campos, mínimo, saldo y Kardex; bloqueo por stock en servicios | Vista mensual por producto, motivos operativos, máximo opcional, permisos de recepción y conciliación |
| Ventas | Venta asociada a un usuario, un medio de pago y líneas con precio histórico | Separar vendedor y cajero cuando corresponda; vincular sesión; registrar costo histórico y procedencia de preventa |
| Caja | No se observó un módulo de sesiones de caja en la base revisada | Apertura, movimientos, arqueo, autorización, cierre e historial |
| Dashboard | Totales/cantidad, serie diaria, top de productos y alertas de stock; compras recientes | Reutilizar lo existente; agregar métricas y vista de compras/ventas mensuales por producto |
| Reportes | `apps/reports/views.py` contiene el esqueleto inicial | Construir consultas y pantallas conciliadas con las operaciones |
| Configuración | Datos del negocio y permisos por grupos | Usuarios en la aplicación, PIN exclusivo de administradores y catálogo básico de cajas |
| Costos | Costo actual en producto; no se observó costo histórico en `SaleItem` | Definir valorización y persistir el costo aplicado antes de publicar utilidad histórica |
| Bodegas | Saldo por producto; sin dimensión de bodega en la base inspeccionada | Empezar con una bodega operativa explícita. Multibodega real implica saldos y movimientos por bodega |

No se debe presentar la selección de un medio de pago como integración con un terminal bancario. Tampoco convertir comprobantes internos en boletas/facturas tributarias solo cambiando su nombre.

## Diseño funcional recomendado

### POS y referencias visuales

- Búsqueda por nombre, SKU y barcode con foco recuperable después de agregar un producto. Usar resultados paginados; no cargar todo el catálogo para buscar.
- Tabla de productos amplia: nombre, SKU, disponibilidad, cantidad editable, precio, descuento e importe. Total y acción principal de cobro fijos a la vista.
- Categorías y favoritos como accesos secundarios; medir si ayudan antes de ocupar permanentemente el espacio del carrito.
- Cobro en una ventana clara con total, medio, recibido, saldo y vuelto. Atajos para monto exacto y billetes frecuentes. Atajos de teclado visibles y probados con lector.
- Pausar y retomar aprovechando la base de ventas pendientes. Confirmar antes de reemplazar un carrito activo; mostrar responsable, hora y total.
- Cliente final como opción predeterminada. Buscar y crear cliente en el mismo flujo, asociándolo al carrito sin perder productos. No exigir registro para toda venta.
- Un botón principal de cobro; las opciones documentales deben corresponder a capacidades reales. Evitar replicar los tres botones de documentos de UVO mientras no exista emisión tributaria.
- Apertura y estado de caja visibles. Cierre y cancelación protegidos de activaciones accidentales. No usar colores como único indicador de error o estado.

### Porcentajes y descuentos

- Mostrar `19%`, `5%`, `10%`, sin ceros decimales añadidos, en POS, configuración, productos, detalle y comprobantes.
- Recomiendo que la primera versión permita porcentajes enteros en los controles de IVA y descuento. Antes de migrar, identificar tasas fraccionarias existentes: no redondearlas silenciosamente. Si son necesarias, acordar su tratamiento con el usuario.
- Mantener precisión decimal interna para cálculos; el formato visible no obliga a cambiar los campos monetarios de la base.
- El código actual calcula IVA incluido en el precio. El resumen debe distinguir neto, IVA y total, evitando sumar IVA nuevamente. Descuento porcentual debe convertirse a importe en backend sobre una base explícita.
- Propuesta inicial: descuento por línea y total resultante calculado, sin superponer otro descuento global. Si se requiere descuento global, definir su reparto entre líneas y la combinación de ambos antes de habilitarlo.
- Configurar límites de descuento por rol, motivo y autorización de excepciones. Los umbrales de DABED de $350.000 y $1.000.000 no son reglas confirmadas de El Boske.

### Caja y usuarios

- Una sesión identifica caja, cajero responsable, apertura, fondo y cierre. Impedir dos sesiones activas incompatibles en la misma caja.
- Una venta cobrada pertenece a una sesión abierta. Cierre y cobro concurrentes deben resolverse sin ventas huérfanas ni movimientos posteriores al cierre.
- Distinguir cajero que cobra, vendedor que originó la operación y administrador que autoriza. En venta directa pueden coincidir vendedor y cajero; conservar ambas atribuciones.
- Solo usuarios con rol administrador pueden tener y gestionar su propio PIN de cuatro dígitos para autorizar el cierre. El cajero registra el conteo y solicita autorización; no recibe un PIN propio de cierre.
- PIN personal por administrador, almacenado con hash, nunca recuperable en texto. Limitar intentos, registrar fallos y revocar su uso al desactivar al administrador o retirar su rol. Guardar qué administrador autorizó cada cierre.
- Propuesta de cierre: capturar conteo antes de revelar el esperado para evitar inducir el resultado; validar esta interacción con el negocio. Observación obligatoria si hay diferencia.
- Conciliar efectivo y también los importes declarados/contrastados de débito, crédito y transferencia, sin tratarlos como efectivo del cajón. Los respaldos pueden ser referencia del terminal o registro manual en esta etapa.
- Cierre definitivo con resumen conservado. Correcciones posteriores mediante eventos autorizados y trazables, sin editar la historia para cuadrarla.

### Inventario y recepción

- Toda salida debe tener responsable, motivo y referencia: venta, retiro interno, merma o ajuste. Incluye retiros del dueño para obras.
- Vista por producto con compras y ventas mensuales, stock actual, mínimo y Kardex. Es una prioridad anterior a sofisticar rankings.
- Máximo configurable y sugerencia de reposición revisable; no generar compras automáticas. Considerar ventas excepcionales y estacionalidad en la revisión humana.
- Permiso acotado para capturar/confirmar recepciones si el negocio lo aprueba, sin habilitar por ello ajustes negativos, edición de precios o anulaciones.
- Investigar carga desde XML de proveedor con archivos anonimizados. Requiere equivalencias de SKU, documentos duplicados, recepción real y casos parciales. XML es un formato distinto de Excel; no basar el diseño en esa equivalencia mencionada en la conversación.
- Cantidades fraccionarias y conversiones de caja/unidad quedan pendientes de comprobar en El Boske. Que DABED venda por unidad no resuelve las necesidades del local objetivo.

### Dashboard y reportes

Dashboard orientado a actuar: resumen diario y acceso al detalle. Propuesta de organización: Resumen diario, Análisis de productos y Rendimiento del personal. Mantener las métricas solicitadas, incorporándolas conforme exista su base de datos.

| Vista | Contenido solicitado y propuesto | Condición |
|---|---|---|
| Resumen diario | Ventas del día, cantidad, ticket promedio, clientes identificados, stock crítico y sin stock; ventas por hora y últimos 30 días; utilidad bruta; tipo de venta hoy | Utilidad después del costo histórico; clientes y tipo de venta con definición explícita |
| Análisis de productos | Ventas por categoría, top 10 por volumen y consulta de compras/ventas mensuales con stock por producto | Productos sin categoría visibles como grupo propio; filtros y unidades claros |
| Rendimiento personal | Ranking de cajeros por transacciones y monto; vendedor originador consultable por separado | Sin mezclar autoría de preventa con cobro |
| Reporte de ventas | Total, transacciones, ticket promedio, ingresos por medio de pago en torta con tabla, histórico lineal, cajeros y top 10 por unidades y monto | Mismo período, estados y criterio de importes en tarjetas, gráficos y exportación |
| Utilidad y márgenes | Ingreso neto, costo de venta, utilidad bruta y margen | Costos históricos aplicados y calidad de información visibles |
| Valorización de bodega | Valor a costo, venta potencial neta y margen potencial | Inicialmente bodega operativa única; no simular filtros de bodegas inexistentes |
| Cuadraturas y cierres | Sesiones, diferencia acumulada, filtro cajero/caja/fecha y exportación Excel | Diferencias por medio; no ocultar faltantes con sobrantes al sumar |

Definiciones propuestas para el diccionario de indicadores:

- Ventas del día: suma del total cobrado de ventas completadas en fecha local `America/Santiago`, con tratamiento explícito de anulaciones y devoluciones. Reportar esas correcciones por separado para explicar el resultado.
- Cantidad de ventas: ventas completadas del mismo universo. Ticket promedio: total de esas ventas / cantidad; con cantidad cero, mostrar sin ventas y evitar división por cero.
- Clientes atendidos: no se puede inferir número de personas ni visitas con certeza a partir de tickets. Mostrar transacciones y clientes identificados únicos por separado; ventas anónimas no cuentan como un único cliente conocido.
- Tipo de venta hoy: propuesta inicial de venta directa frente a venta originada en preventa; validar. Medio de pago y tipo de documento son dimensiones distintas.
- Stock crítico: propuesta `0 < stock <= mínimo`; sin stock: `stock = 0`, categorías sin solaparse.
- Ingreso neto: ventas después de descuentos y devoluciones, sin IVA. Utilidad bruta: ingreso neto menos costo histórico de lo vendido. Margen: utilidad bruta / ingreso neto × 100; si el denominador es cero, no aplica. No llamarlo utilidad neta del negocio.
- Recargo sobre costo y margen sobre venta son indicadores diferentes; no copiar las expresiones coloquiales de la entrevista como fórmulas.
- Valorización: unidades actuales × costo unitario según método acordado. Venta potencial neta: unidades × precio neto vigente. Margen potencial monetario: venta potencial neta menos valor a costo; porcentaje: ese margen / venta potencial neta cuando sea positiva. Es una estimación, no ingreso realizado.
- Efectivo esperado: fondo inicial + efectivo neto cobrado + entradas de efectivo − retiros − reembolsos en efectivo. Efectivo neto cobrado descuenta el vuelto, evitando sumarlo dos veces. Diferencia: contado − esperado.
- Descuadre acumulado: suma algebraica de diferencias del universo filtrado, junto con total de faltantes y total de sobrantes separados. Diferencias de otros medios se muestran por medio, sin atribuirlas al cajón.
- Costos históricos faltantes: marcar no disponible o cobertura parcial. No reconstruir utilidad histórica usando el costo actual como si fuera el costo de aquella venta.

## Roadmap por sprints

Supuesto de cadencia: Sprint 0 de una semana y Sprints 1 a 8 de dos semanas, 17 semanas nominales. Es una secuencia de referencia, no una promesa de entrega. Ajustar carga tras estimar con el equipo y conocer su disponibilidad.

Las estimaciones de las tareas son días-persona iniciales, no duración de calendario. `BE` backend; `FE` frontend y UX; `QA` verificación; `AF` análisis funcional. Son roles propuestos, no asignaciones a personas. Dependencias representan prerrequisitos de tarea; cada sprint requiere además la aceptación del incremento anterior. Las validaciones con el negocio se coordinan dentro de las tareas funcionales, sin asumir que ya se realizaron.

El desglose contiene 48 tareas y suma 118 días-persona. Como referencia de capacidad, usando 8 horas por día-persona son 944 horas; con una reserva adicional del 20% serían aproximadamente 1.133 horas, unas 67 horas semanales de equipo durante 17 semanas. Es un promedio para contrastar disponibilidad, no prueba de que las dependencias permitan ese plazo. Si el equipo dispone de menos horas, extender el calendario o reducir el alcance al siguiente hito; no comprimir todas las funciones en el mismo compromiso.

| Sprint | Semanas relativas | Objetivo | Entregable verificable |
|---|---|---|---|
| S0 | 1 | Reglas y alcance | Acta, flujo, diccionario y backlog priorizado |
| S1 | 2–3 | POS eficaz | Venta directa mejorada con cliente y cobro único |
| S2 | 4–5 | Caja y autorizaciones | Apertura, movimientos, cierre e historial por medio |
| S3 | 6–7 | Stock y reposición | Movimientos trazables y consulta mensual por producto |
| S4 | 8–9 | Pausas y preventas | Traspaso de vendedor a caja sin duplicados |
| S5 | 10–11 | Dashboard operativo | Resumen diario, análisis de productos y cajeros |
| S6 | 12–13 | Reportes de ventas y cierres | Filtros, conciliación y exportación histórica |
| S7 | 14–15 | Utilidad y valorización | Reportes sobre costos históricos y stock valorizado |
| S8 | 16–17 | Piloto y entrega | Evidencia de aceptación, manuales y recuperación |

**Hito A al cerrar S3**: candidato a próximo MVP operativo con POS, caja y stock controlado, sujeto a aceptación de esos flujos. **Hito B al cerrar S6**: preventas, dashboard y reportes operativos completos. **Hito C al cerrar S8**: alcance ampliado validado, incluyendo rentabilidad y valorización. Cada incremento requiere sus verificaciones; S8 no reemplaza las pruebas anteriores. Si el plazo académico es menor, cerrar un hito verificable y dejar el siguiente como backlog.

### Sprint 0 Reglas y alcance

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 1.1 / S0-01 | Consolidar hallazgos y discrepancias de fecha, stock y flujo [E1 E2 E4] | AF | 1 | — | Matriz distingue evidencia, petición y propuesta; acta fija pendientes |
| 1.2 / S0-02 | Acordar reglas de caja, porcentajes, descuentos, stock, usuarios e indicadores [E1 E4 E5] | AF BE | 2 | S0-01 | Ejemplos aprobados; identificados vendedor, cajero y autorizador; estados y permisos definidos |
| 1.3 / S0-03 | Prototipar venta directa, pago y cierre con identidad BoskePOS [E3 E4] | FE AF | 2 | S0-02 | Recorrido revisado con usuarios; cantidad de acciones y tiempos iniciales registrados |
| 1.4 / S0-04 | Estimar backlog y fijar capacidad, riesgos, responsables y datos de prueba [E4 E5] | AF QA | 1 | S0-03 | Tarjetas y dependencias revisadas; responsables nominales y calendario pendientes solo si aún no hay disponibilidad |

### Sprint 1 POS eficaz

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 2.1 / S1-01 | Unificar presentación de IVA y descuentos porcentuales [E4] | FE BE | 2 | S0-02 | 19% y 5% sin ceros añadidos en superficies afectadas; no cambia el total por formatear; excepciones existentes identificadas |
| 2.2 / S1-02 | Reorganizar búsqueda, carrito, total y atajos [E3 E4] | FE | 3 | S0-03 | Venta representativa con lector y teclado; foco recuperado y errores visibles; comparar acciones con línea base |
| 2.3 / S1-03 | Crear y asociar cliente dentro del POS [E2 E3] | FE BE | 2 | S1-02 | Alta con validación y control de duplicados; carrito intacto; cliente final sigue disponible |
| 2.4 / S1-04 | Aplicar descuentos enteros con límites, motivo y autorización de excepción [E1 E4] | BE FE | 3 | S0-02, S1-01 | Backend recalcula; no supera el importe ni el límite sin autorización; registro identifica aprobador |
| 2.5 / S1-05 | Simplificar pago y proteger cobro con idempotencia [E3 E5] | BE FE | 4 | S1-02 | Doble clic, reintento y timeout no duplican venta ni stock; misma clave y distinto contenido se rechaza; vuelto correcto |
| 2.6 / S1-06 | Verificar venta directa, permisos, importes y concurrencia [E4 E5] | QA BE | 2 | S1-01, S1-03, S1-04, S1-05 | Casos críticos documentados; pruebas concurrentes en PostgreSQL; recorrido aceptado por usuario |

### Sprint 2 Caja y autorizaciones

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 3.1 / S2-01 | Crear sesiones de caja y apertura con fondo inicial [E1 E3 E4] | BE FE | 3 | S1-06 | Caja/responsable/horas guardados; apertura incompatible rechazada; venta exige sesión abierta |
| 3.2 / S2-02 | Añadir usuarios y PIN personal exclusivo de administradores [E3 E4] | BE FE | 3 | S0-02 | Solo admin puede disponer y gestionar su PIN; hash, límite de intentos y revocación por rol/estado verificados |
| 3.3 / S2-03 | Registrar entradas, retiros y efectos de anulación por medio [E1 E3] | BE FE | 3 | S2-01 | Motivo y actor obligatorios; vuelto no se duplica; corrección vinculada a operación original |
| 3.4 / S2-04 | Construir arqueo y autorización de cierre [E1 E3 E4] | BE FE | 4 | S2-02, S2-03 | Contado/esperado/diferencia por medio; observación si difiere; PIN inválido impide cierre; autorizador identificado |
| 3.5 / S2-05 | Conservar resumen e historial de sesiones [E1 E4] | BE FE | 2 | S2-04 | Detalle recuperable por sesión; filtros básicos; no permite editar cierre definitivo |
| 3.6 / S2-06 | Verificar carrera entre cobro y cierre y aceptación de arqueo [E5] | QA BE | 2 | S2-05 | Sin venta huérfana ni movimiento posterior; casos de vuelto/retiro/anulación cuadran; evidencia de aceptación |

### Sprint 3 Stock y reposición

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 4.1 / S3-01 | Definir costo aplicado y persistirlo en ventas y movimientos nuevos [E1 E5] | BE AF | 4 | S0-02, S2-06 | Método explícito; precio/costo/IVA histórico suficiente para reportes; reversas coherentes; cobertura de datos viejos marcada |
| 4.2 / S3-02 | Tipificar retiros internos, mermas y ajustes autorizados [E1] | BE FE | 3 | S0-02 | Cada salida tiene actor/motivo/referencia; Kardex y saldo coinciden; vendedor sin permiso no ajusta |
| 4.3 / S3-03 | Mostrar compras y ventas mensuales por producto con stock y Kardex [E1 E2] | BE FE | 3 | S3-02 | Comparación por mes conciliada; meses sin movimiento visibles; desde alerta se abre el producto |
| 4.4 / S3-04 | Incorporar máximo opcional y sugerencia revisable de reposición [E1] | BE FE | 2 | S3-03 | Mínimo/máximo válidos; cálculo explicado; usuario decide cantidad final; no crea compra automática |
| 4.5 / S3-05 | Acotar permisos de recepción y estudiar muestra XML [E1] | AF BE | 2 | S3-02 | Matriz y flujo de recepción validados; muestra anonimizada o dependencia documentada; lista de campos y equivalencias, sin prometer importador |
| 4.6 / S3-06 | Conciliar stock, costos y bodega operativa inicial [E1 E4 E5] | BE QA | 3 | S3-01, S3-02, S3-03, S3-04, S3-05 | Bodega única explícita con saldos/movimientos trazables; migración ensayada; balance físico y valorizado comprobados; aceptación del hito A |

### Sprint 4 Pausas y preventas

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 5.1 / S4-01 | Separar pausa y preventa con sus estados y permisos [E1 E3] | AF BE | 2 | S3-06 | Definidas caducidad, propiedad, reserva y momento de movimiento; propuesta inicial sin reserva automática |
| 5.2 / S4-02 | Mejorar listado de pausadas y recuperación de carrito [E3 E5] | FE BE | 2 | S4-01 | Responsable/hora/total visibles; no se sobrescribe carrito activo; stock/precio se revalidan |
| 5.3 / S4-03 | Crear preventa y ticket interno con identificador escaneable [E3] | BE FE | 3 | S4-01 | Ticket recuperable por ID/código; no se cuenta como venta cobrada ni como documento tributario |
| 5.4 / S4-04 | Recuperar preventa en caja y conservar vendedor/cajero [E1 E3] | BE FE | 3 | S4-03, S2-06 | Conversión única; revalidación de stock, precio y descuento; autoría original y caja de cobro conservadas |
| 5.5 / S4-05 | Verificar recuperación concurrente, abandono y cambios de disponibilidad [E5] | QA BE | 2 | S4-02, S4-04 | Dos cajas no cobran la misma preventa; cancelación no duplica salidas; usuario valida el traspaso |

### Sprint 5 Dashboard operativo

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 6.1 / S5-01 | Centralizar consultas y definiciones compartidas de indicadores [E4 E5] | BE AF | 2 | S4-05 | Período local, estados, devoluciones, importes y filtros documentados; reutilizables por reportes |
| 6.2 / S5-02 | Completar tarjetas de resumen diario y alertas con acceso a detalle [E1 E4] | FE BE | 2 | S5-01 | Ventas/cantidad/ticket/clientes/stock conciliados; límites entre crítico y cero probados; no infiere personas anónimas |
| 6.3 / S5-03 | Incorporar ventas por hora y últimos 30 días [E4] | BE FE | 2 | S5-01 | Zona local correcta, horas/días sin ventas y cambios de período cubiertos; tabla accesible |
| 6.4 / S5-04 | Añadir categoría, top 10 por volumen, tipo de venta y ranking cajeros [E4] | BE FE | 3 | S5-01 | Dimensiones separadas; sin categoría visible; montos/transacciones por cajero; preventas pendientes excluidas |
| 6.5 / S5-05 | Publicar utilidad bruta diaria con cobertura histórica y permisos [E4 E5] | BE FE | 2 | S3-01, S5-01 | Costos faltantes no se asumen cero; solo perfiles habilitados ven rentabilidad |
| 6.6 / S5-06 | Validar indicadores y rendimiento con catálogo representativo [E1 E4] | QA BE | 2 | S5-02, S5-03, S5-04, S5-05 | Datos de control reproducibles y tiempos medidos; coincidencia entre tarjeta/gráfico/detalle |

### Sprint 6 Reportes de ventas y cierres

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 7.1 / S6-01 | Construir filtros comunes y reporte de ventas [E4] | BE FE | 3 | S5-06 | Total/transacciones/ticket e histórico lineal coinciden con operaciones filtradas; rangos mayores a un mes admitidos con límites de rendimiento |
| 7.2 / S6-02 | Desglosar ingresos por medio, cajeros y top 10 unidades/monto [E1 E4] | BE FE | 2 | S6-01 | Torta con tabla y totales por medio; ranking no atribuye dos veces la misma venta |
| 7.3 / S6-03 | Completar cuadraturas con filtros y faltantes/sobrantes [E1 E4] | BE FE | 3 | S6-01, S2-05 | Lista por cajero/caja/fecha; suma neta y faltantes/sobrantes separados; detalle de medios no efectivos |
| 7.4 / S6-04 | Exportar reportes e histórico de cierres a Excel [E4] | BE FE | 2 | S6-02, S6-03 | Archivo XLSX reproduce filtros y totales; fechas/montos utilizables; permisos y textos que parecen fórmulas tratados con seguridad |
| 7.5 / S6-05 | Conciliar reportes, dashboard y exportaciones [E4 E5] | QA AF | 2 | S6-04 | Mismo universo da mismos totales; anulaciones/reembolsos y cierres históricos explicables; aceptación del hito B |

### Sprint 7 Utilidad y valorización

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 8.1 / S7-01 | Revisar cobertura del costo histórico y casos de reversa [E1 E5] | BE AF | 2 | S6-05, S3-01 | Casos de compras sucesivas, anulación y stock cero conciliados; datos faltantes identificados |
| 8.2 / S7-02 | Crear reporte de ingreso neto, costo, utilidad bruta y margen [E4] | BE FE | 3 | S7-01 | Descuentos/IVA/costo aplicados según diccionario; porcentaje indefinido no aparece como cero engañoso |
| 8.3 / S7-03 | Crear valorización de bodega operativa a fecha de consulta [E4] | BE FE | 3 | S7-01, S3-06 | Valor a costo y venta neta potencial cuadran con saldos; no afirma multibodega; fecha de consulta visible |
| 8.4 / S7-04 | Incorporar margen potencial, exportación y control de acceso [E4] | BE FE | 2 | S7-02, S7-03 | Fórmulas explicitadas; márgenes negativos visibles; usuario sin permiso no obtiene datos por API ni exportación |
| 8.5 / S7-05 | Validar cifras con casos numéricos y usuario administrador [E4] | QA AF | 2 | S7-04 | Cambiar costo/precio actual no altera utilidad pasada; cálculo manual de muestra coincide con el reporte |

### Sprint 8 Piloto y entrega

| WBS / ID | Tarea y fuente | Rol | Días-persona | Depende de | Criterio de aceptación y evidencia |
|---|---|---|---|---|---|
| 9.1 / S8-01 | Preparar piloto con datos anonimizados, cuentas y periféricos [E4 E5] | AF QA | 2 | S7-05 | Catálogo representativo, lector e impresora configurados; casos y responsables acordados |
| 9.2 / S8-02 | Ejecutar UAT de vender, pausar, preventa, cierre, recepción y consulta [E1 E4] | QA AF | 3 | S8-01 | Evidencias por rol; acciones/tiempos comparados con línea base; decisiones y defectos registrados |
| 9.3 / S8-03 | Corregir bloqueantes y verificar regresiones afectadas [E5] | BE FE QA | 4 | S8-02 | Cero defectos críticos abiertos; repetición de casos afectados y concurrencia relevante |
| 9.4 / S8-04 | Ensayar respaldo/restauración y recuperación de operaciones inciertas [E5] | BE QA | 2 | S8-01 | Restauración en base separada y tiempos medidos; reintentos no duplican; procedimiento ejecutable |
| 9.5 / S8-05 | Entregar manuales, versión, trazabilidad y acta de aceptación [E4 E5] | AF QA | 2 | S8-03, S8-04 | Funciones demostradas enlazadas a tareas/requisitos; limitaciones explícitas; acta y evidencia del hito C |

## Uso en Planner y relación con EDT y Gantt

Este documento prepara las tarjetas; no se ha creado ni modificado un plan de Microsoft Planner.

- Propuesta de buckets por estado: Backlog, Lista, En curso, En revisión, Validación de usuario y Hecha. La columna identifica el estado y una etiqueta identifica el sprint. Si el equipo prefiere buckets por sprint, usar el progreso de la tarea para el estado; elegir una convención única al configurar el tablero.
- Título de tarjeta: `[S2-04] Construir arqueo y autorización de cierre`. Incluir WBS `3.4` en la descripción para conservar el vínculo con la EDT.
- Descripción: problema, alcance, fuente E1–E5, dependencias por ID y criterio de aceptación de la fila correspondiente.
- Asignación: una persona responsable por tarjeta; colaboradores por checklist. Los roles de este plan no sustituyen responsables nominales.
- Checklist según tarea: diseño/reglas revisadas, implementación, validación crítica, revisión, documentación y evidencia. No marcar pasos de implementación en tareas solo de análisis.
- Adjuntos/enlaces: mockup, decisión funcional, commit o PR, caso ejecutado y evidencia de aceptación. Datos reales anonimizados; nunca adjuntar PIN ni credenciales.
- Fechas: completar cuando exista inicio real y disponibilidad. No convertir días-persona directamente en duración de calendario. Reservar capacidad para revisión, validación y corrección, y replanificar con el desempeño observado.
- Registrar bloqueo y prerrequisito aunque la edición disponible de Planner no permita dependencias nativas. El cronograma debe preservar las relaciones al pasarlas a la herramienta de Gantt elegida.

EDT orientada a entregables: `1 Definición`, `2 POS`, `3 Caja y usuarios`, `4 Inventario`, `5 Preventas`, `6 Dashboard`, `7 Reportes operativos`, `8 Rentabilidad y valorización`, `9 Validación y entrega`. Los códigos de dos niveles de las tablas identifican paquetes de trabajo trazables. Conservarlos aunque una tarea cambie de sprint.

Para alimentar Gantt: ID, WBS, nombre, duración estimada de calendario, predecesoras, responsable y fechas. Para seguimiento: estado, esfuerzo real, evidencia y criterio de aceptación. La suma de días-persona de las tablas representa esfuerzo inicial, no camino crítico ni plazo garantizado.

Ejemplo de tarjeta completa:

```text
Título: [S2-04] Construir arqueo y autorización de cierre
WBS: 3.4
Sprint: S2
Estado inicial: Backlog
Prioridad: Alta
Responsable nominal: Por asignar
Roles: Backend y frontend
Esfuerzo inicial: 4 días-persona
Predecesoras: S2-02, S2-03
Fuente: E1 entrevista, E3 imágenes de cierre, E4 solicitud
Problema: conciliar el turno sin reimprimir cada venta y registrar quién autoriza.
Alcance: contado, esperado y diferencia por medio; observación; autorización admin.
Aceptación: PIN inválido impide cerrar; diferencia exige observación;
            sesión cerrada conserva resumen y administrador autorizador.
Evidencia: casos de prueba, PR/commit y validación de usuario enlazados.
Inicio y fin: Por programar según disponibilidad y predecesoras.
```

## Decisiones pendientes y ampliaciones

Resolver en S0: venta sin stock frente a pedido pendiente; porcentajes fraccionarios existentes; límites y aprobadores de descuentos; método de costo; qué representa tipo de venta; esquema de usuarios/cajas; tratamiento de anulaciones y eventuales devoluciones; capacidad y fecha académica. No son motivos para detener el análisis o el prototipo, pero sí prerrequisitos de las implementaciones afectadas.

Ampliaciones separadas del calendario base: pagos mixtos, crédito tienda/cuentas por cobrar, devoluciones parciales completas, cotizaciones con seguimiento, pedidos pendientes, importador XML productivo, fracciones/conversiones, múltiples sucursales/bodegas con traslados, emisión tributaria SII y sincronización offline. De cada una hay que validar necesidad, reglas y esfuerzo antes de comprometerla. Los ajustes o anulaciones ya disponibles no equivalen a un módulo completo de devoluciones parciales.

La referencia de configuración no obliga a construir diez mantenedores. Conservar la organización actual; agregar Usuarios y Cajas donde corresponda. Categoría ya es entidad y marca/ubicación son campos: convertir estos últimos en catálogos solo si se necesita administración independiente. Una pestaña visible no debe insinuar una función inexistente.

## Definición de terminado

Cada tarea debe cumplir su aceptación, tener revisión, evidencia enlazada y documentación actualizada. Para cambios funcionales, coherencia entre API y UI, permisos efectivos en backend, estados y errores claros y pruebas de caminos críticos. Para operaciones monetarias o de stock, cubrir reintentos, concurrencia y reversas relevantes. Para reportes, conciliar con las operaciones y comprobar filtros, fechas, totales y exportaciones. Validar las historias operativas con el rol afectado antes de declararlas aceptadas.

Medir desde S0 y comparar en cada incremento: acciones y tiempo de venta representativa, tiempo de búsqueda, tiempo de cierre, ventas duplicadas, diferencias de stock detectadas y coincidencia de reportes. Fijar metas de tiempo con la línea base y el equipo; no inventar resultados de mejora antes de medir.
