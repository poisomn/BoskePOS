# Calendario, dashboard y auditoría

Actualización del 20 de octubre de 2026.

## Implementado

- Calendario compartido basado en la documentación de shadcn Calendar recibida y React DayPicker 9. Meses, días, navegación y accesibilidad en español, semana desde lunes, identidad verde BoskePOS.
- Selección de rangos con borrador: Aplicar consulta el período; Cancelar descarta cambios. Accesos Hoy, Ayer, últimos 7/30 días y Este mes. Selección de mes/año y entrada manual ISO. Calendario completo centrado en móvil.
- Dashboard admite hasta 31 días; Reportes hasta 366. Las validaciones ocurren antes de llamar a la API. Fechas civiles y accesos rápidos usan America/Santiago, incluidos los cambios de hora.
- Calendario integrado en Dashboard, Reportes y Kardex de Productos, reemplazando todas las selecciones nativas de fecha existentes en las pantallas operativas. Kardex permite limpiar el filtro; Reportes muestra inicialmente el rango efectivo de últimos 30 días.
- Al final del dashboard, siempre visibles: cantidad de ventas, clientes identificados, transacciones anónimas, stock bajo, sin stock, catálogo activo, stock saludable e importe de preventas pendiente. Debajo: compras recientes, movimientos recientes, alertas y acciones rápidas. Los dos gráficos originales se mantienen.
- Los rótulos distinguen métricas del período y situación actual. La respuesta más reciente del filtro tiene prioridad sobre solicitudes anteriores.
- Auditoría muestra Producto / SKU en la tabla y todos los productos en la ficha. Los movimientos nuevos registran cantidad, saldo anterior/nuevo, motivo y referencia. Se conserva una instantánea de nombre y SKU para productos y preventas/recepciones.
- Los eventos anteriores se enriquecen al consultar mediante vínculos disponibles, sin reescribir el historial. Si un producto antiguo fue eliminado y no se conservó identidad, se indica que la identidad histórica no está disponible. Las líneas de recepción muestran el producto, además de cantidad/costo.

No se requieren migraciones adicionales para esta actualización. Los datos de prueba visuales se generaron solamente en la copia SQLite de revisión.

## Siguientes mejoras sugeridas

1. Comparar el período con los mismos días del período anterior: ventas, transacciones y ticket promedio con variación porcentual. Mantener separado el stock actual.
2. Marcar en el calendario días con ventas y cierres de caja; mostrar un resumen al elegir el día, consultando datos reales del mes visible.
3. Guardar el período en la URL junto a los filtros, para volver a la misma consulta y compartirla con usuarios que ya tengan permisos.
4. Exportar un reporte cuyo nombre y encabezado incluyan el rango aplicado y la fecha de generación.

Referencia: https://ui.shadcn.com/docs/components/base/calendar

Validación final: 189 pruebas del backend sobre PostgreSQL, 4 pruebas de fechas, lint y compilación correctos. Revisión interactiva de Dashboard, Reportes y Kardex; calendario probado a 390 px sin desborde y auditoría verificada con nombre, SKU, cantidad y saldos.
