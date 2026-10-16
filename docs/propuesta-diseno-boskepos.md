# BoskePOS: identidad e interfaz

Fecha: 13 de octubre de 2026.

## Integración realizada

- Nuevo logo del árbol robótico en navegación, acceso, carga y vista del sistema de diseño. Se conserva el archivo anterior, pero la interfaz ya no lo referencia.
- Favicon ICO, PNG de 16 y 32 px, icono Apple y manifest con nombre BoskePOS e iconos Android.
- Fondo blanco; verde bosque `#00843d` en acciones y selección; navy `#142a3b` para texto y jerarquía. El verde lima de la mascota queda como acento visual. Las advertencias siguen siendo ámbar y los errores rojos.
- Barra lateral de altura completa, fija durante el desplazamiento, con navegación interna desplazable y grupos por tarea. Cabecera alineada a 88 px con el logo; nombre del módulo actual y cuenta compacta.
- Menú móvil modal con cierre explícito, Escape, foco contenido dentro del menú y cierre al navegar o pasar a escritorio. Enlace para saltar al contenido y focos visibles.
- Mascota del ZIP usando el PNG transparente adjunto: guiño en acceso, carga al ingresar y al abrir módulos, error de acceso, reposo en búsqueda POS vacía, inactividad en tablas vacías y celebración temporal al registrar una venta. El estado siempre tiene un mensaje escrito.
- Animaciones detenidas fuera de pantalla, con pestaña oculta y con preferencia de movimiento reducido. La celebración vuelve a reposo tras 2,4 segundos.
- Estado de caja compacto y adaptable; carrito POS con acento verde, filas numéricas más legibles y etiquetas accesibles en paginación. El bloque fijo de total/cobro se propone como siguiente mejora.

## Dirección visual propuesta

Mantener un espacio de trabajo luminoso y sobrio: superficies blancas, bordes suaves, títulos navy y una acción verde principal por panel. Evitar que el verde lima ocupe grandes áreas; funciona mejor en la mascota y en pequeños detalles. Mantener separación de 24–32 px entre secciones y 12–16 px dentro de cada grupo de controles.

Usar encabezados consistentes: título, explicación breve, acción principal y después filtros. Las tablas necesitan columnas numéricas alineadas a la derecha, estados con texto además de color, acciones discretas y filas seleccionadas claramente visibles. Los mensajes vacíos deben indicar cómo continuar; un error necesita una acción de recuperación.

La mascota debe acompañar momentos de espera o confirmación. En el POS conviene limitarla a estados vacíos y celebraciones breves para que el movimiento no compita con cantidades, precios y cobro. El estado inactivo es ilustrativo: no debe confundirse con un bloqueo real de sesión.

## Propuestas por sección (pendientes de implementación)

| Sección | Diseño y comportamiento propuestos | Prioridad |
| --- | --- | --- |
| POS | Dos zonas claras: búsqueda y resultados a la izquierda, venta y pago a la derecha. Compactar cada línea a nombre, cantidad, precio y subtotal; desplegar descuentos y observaciones solo cuando se soliciten. Mantener total y botón «Cobrar $…» siempre visibles al pie del panel, aunque el carrito sea largo. | Alta |
| POS: búsqueda | Mostrar precio, unidad de venta y disponibilidad junto al nombre. Mantener búsqueda por escáner, flechas y Enter; mostrar una ayuda breve de atajos. Diferenciar «buscando», «sin coincidencias» y «sin stock». Considerar favoritos solo con una selección real del usuario. | Alta |
| POS: pago | Métodos de pago como botones de selección, monto recibido y vuelto con jerarquía grande. Resumen final con cliente, cantidad de artículos y total. Después del éxito, acceso inmediato a comprobante y «Nueva venta». Reutilizar cálculo y confirmación del backend. | Alta |
| Dashboard | Encabezado más breve, saludo por nombre y selector de período compacto. Primero ventas, cantidad de tickets, ticket promedio y alertas de stock. Debajo, tendencia y pendientes accionables; al final, actividad reciente. Mostrar comparación con el período anterior solo cuando la API la entregue. | Alta |
| Ventas | Filtros por estado, fecha y medio de pago; resumen del resultado filtrado. Tabla con fecha, número, cliente, total y estado; detalle con comprobante, pagos y anulación claramente diferenciados. Mantener visible la condición de comprobante interno. | Alta |
| Compras | Separar borrador, recepción y cancelación visualmente. Asistente por pasos para proveedor, partidas y revisión. Resaltar diferencias de cantidades y costos antes de confirmar recepción; conservar el historial. | Media |
| Productos | Tabla con nombre/SKU, categoría, unidad, precio y stock. Chips «Bajo mínimo», «Sin stock» y «Inactivos». Panel de detalle para ficha y movimientos; ajustes de stock separados de edición comercial. Costos y márgenes visibles únicamente con permiso. | Alta |
| Categorías | Lista compacta con nombre y acciones visibles; estado vacío con «Crear categoría». Añadir recuento de productos solo con datos reales de la API. Evitar tarjetas grandes para registros simples. | Media |
| Clientes | Buscador por nombre o RUT; ficha con datos de contacto y acceso al historial. Evitar formularios extensos para seleccionar cliente en POS. Separar información básica de campos opcionales. | Media |
| Proveedores | Ficha con contacto, identificación y compras asociadas. Búsqueda y acción «Registrar compra» desde el proveedor cuando exista permiso. Indicadores de deuda o plazos requieren datos nuevos; no mostrar estimaciones como saldos reales. | Media |
| Configuración | Agrupar negocio, contacto, impuestos y comprobante en bloques claros. Vista previa del ticket junto al formulario. Barra de guardado y señal de cambios pendientes; errores junto a cada campo y confirmación breve después de guardar. | Media |
| Acceso | Mantener logo legible, mensaje cercano y formulario conciso. Incorporar mostrar/ocultar contraseña y errores asociados a los campos. Una opción para recuperar acceso depende del flujo real de autenticación. | Media |

## Orden de trabajo sugerido

1. POS: compactar líneas y fijar el bloque total/cobro; comprobar con carritos de 1, 10 y 30 líneas, teclado y escáner. A 1366 × 768 px, total y cobro deben permanecer disponibles sin desplazar toda la página.
2. Productos y ventas: filtros y detalle coherentes; verificar permisos, números en CLP, carga, ausencia de resultados y errores.
3. Dashboard: reducir el espacio del encabezado y hacer prioritarias las alertas. Cualquier comparación debe conciliar con los filtros y los datos del backend.
4. Clientes, proveedores, compras y configuración: reutilizar los patrones aprobados y reducir pasos de formularios.

Validar cada etapa con tareas concretas de cajero, vendedor y administrador, en escritorio y móvil. Criterios: sin recortes ni desbordamiento horizontal de la página; navegación completa con teclado; contraste legible; estado comunicado en texto; datos financieros y permisos conservados.
