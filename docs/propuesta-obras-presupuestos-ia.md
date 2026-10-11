# BoskePOS: solicitud de obra y presupuesto asistido por IA

Fecha: 11 de octubre de 2026.
Estado: especificación propuesta para desarrollo; no describe funciones implementadas.

## Propósito y contribución

Convertir una conversación informal sobre una obra, construcción, remodelación o demolición en un expediente estructurado y un presupuesto revisable, conectado con catálogo, inventario y abastecimiento del ERP. El producto se orienta a empresas del rubro; Diego y su equipo constituyen el primer contexto de aplicación, no el límite del producto.

La contribución informática propuesta es mantener continuidad y procedencia entre lenguaje natural, levantamiento en terreno, partidas, cálculos, productos, precios y operaciones. La IA interpreta y propone; las reglas de cálculo y los servicios del ERP validan; el responsable autoriza la emisión.

## Proceso funcional

1. Registrar una solicitud por texto; incorporar voz y fotografías en incrementos posteriores. Permitir captura por el vendedor o maestro en nombre del cliente.
2. Extraer objetivos, trabajos solicitados, medidas explícitas, preferencias y restricciones. Confirmar con el usuario la interpretación.
3. Detectar datos faltantes mediante plantillas por tipo de trabajo. Formular preguntas breves y agrupar las relacionadas.
4. Permitir generar una estimación preliminar con supuestos visibles, aunque todavía falte una visita. No presentarla como presupuesto verificado.
5. Si hace falta levantamiento, generar una ficha con medidas, fotografías y observaciones pendientes; asignar visita, fecha y responsable.
6. Registrar el levantamiento sobre el mismo expediente. Conservar datos anteriores y marcar diferencias.
7. Proponer partidas, materiales y servicios. Asociar candidatos del catálogo sin crear productos automáticamente.
8. Calcular cantidades y presentación comercial mediante reglas identificables. Resolver pendientes y validar por el responsable.
9. Emitir una versión del presupuesto con PDF, alcance, exclusiones, condiciones, vigencia y plan de pagos.
10. Registrar aceptación o cambios del cliente sobre una versión concreta. Crear una nueva versión para modificaciones posteriores.
11. Tras aceptación, vincular necesidades de materiales, pedido, reservas y abastecimiento con el ERP. Registrar recepción, entrega o consumo una sola vez en los servicios correspondientes.

## Caso inicial de referencia

Solicitud: remodelar habitación de 5 m²; reemplazar cerámico por piso flotante de alta calidad; revestir muro; instalar clóset de melamina RH gris de 1,80 × 1,50 × 0,70 m, con dos puertas y dos cajones; agregar un enchufe.

| Componente | Información recibida | Datos que deben resolverse |
|---|---|---|
| Piso | Superficie indicada de 5 m²; cerámico existente; piso flotante de alta calidad | Medidas y forma, estado de base, retiro, nivelación, producto, cobertura por caja, merma, manta y guardapolvos según alcance |
| Muros | Solicitud de revestimiento de cartón | Material exacto, muros incluidos, largo y alto, vanos, soporte y terminación |
| Clóset | RH gris; tres dimensiones; dos puertas y dos cajones | Orden alto/ancho/fondo, distribución, espesor, herrajes, trasera y condiciones de instalación |
| Enchufe | Un punto adicional | Ubicación y recorrido; condiciones existentes para revisión del responsable; materiales y trabajo definidos tras evaluación |
| Logística | No especificada | Dirección, acceso, horarios, traslado, residuos y plazos |

No inferir superficie de muro a partir de superficie de piso. No deducir un despiece fiable del clóset solo de sus dimensiones exteriores. Las instalaciones y trabajos que requieran evaluación técnica conservan esa evaluación como dato pendiente; el chatbot no la sustituye.

## Análisis del PDF de referencia

Fuente local: C:/Users/chris/Downloads/presupuesto-remodelacion-habitacion.pdf. Tres páginas revisadas mediante extracción y renderizado.

- 26 líneas: carpintería (12), electricidad (4), albañilería (1) y mano de obra (9).
- Subtotal neto declarado: CLP 1.159.000; impuesto declarado: CLP 220.210; total: CLP 1.379.210.
- Dos hitos de CLP 689.605 y vigencia de 30 días.
- Supuestos explícitos: espesor de 18 mm y cajones de unos 25 cm de alto.
- El cliente no está identificado en el bloque PARA. Debe completarse antes de emitir una propuesta dirigida a un cliente.
- Los 15 m² de muro y 10,1 metros de canalización no se justifican mediante mediciones visibles en el documento.
- Se cotizan tres rollos de conductor de 100 metros. Deben distinguirse necesidad por color, unidad de compra y existencias disponibles; esa compra no se justifica solo por agregar un enchufe.
- No hay una partida inequívoca de retiro del cerámico ni detalle de preparación de base. Confirmar inclusión, exclusión o partida específica.
- Los precios del PDF son ejemplos aportados; no se verificaron contra un catálogo externo ni se adoptan como precios actuales.
- La suma de líneas de mano de obra mostradas es CLP 551.313; el subtotal impreso es CLP 551.312. Definir precisión y redondeo para reconciliar líneas, categorías, impuestos y total.

## Modelo propuesto

| Entidad | Información principal |
|---|---|
| Empresa | Identidad, configuración, catálogo y políticas propios |
| Proyecto | Empresa, cliente, dirección de obra, tipo, descripción, responsable y estado |
| Solicitud | Texto original, autor y fecha; vínculo al proyecto |
| Dato de proyecto | Campo, valor, unidad, origen, estado de verificación, responsable y evidencia |
| Visita | Fecha, asignado, lista de pendientes, observaciones y estado |
| Partida | Trabajo, alcance, cantidad, unidad y vínculo a mediciones o regla |
| Necesidad de material | Material, cantidad requerida, unidad técnica, SKU candidato y resolución |
| Cotización / versión | Valores congelados, estado, vigencia, condiciones e identidad comercial |
| Línea de cotización | Material, servicio u otro; cantidad, unidad, precio y trazabilidad |
| Evento | Actor, fecha, acción y entidades afectadas |

Orígenes de datos: cliente, medición en terreno, cálculo por regla, catálogo y propuesta de IA. Estados de verificación separados del origen: pendiente, confirmado o reemplazado. Un dato aportado por el cliente puede estar confirmado por él y pendiente de verificación en terreno.

Conservar entradas y resultados estructurados de la generación, versión de plantilla/reglas, modelo utilizado, cambios del revisor y costo/tiempo de generación. No almacenar razonamiento interno del modelo. Minimizar datos personales enviados al servicio de IA.

## Estados separados

- Proyecto: solicitado, en levantamiento, en cotización, aprobado, en ejecución, terminado, cancelado.
- Cotización: borrador, revisada, emitida, aceptada, rechazada, vencida, reemplazada.
- Visita: pendiente, agendada, realizada, cancelada.
- Cobro, entrega y disponibilidad tienen estados propios; aceptar una cotización no demuestra pago o entrega.

La estimación preliminar se identifica por su grado de verificación, no por un cambio artificial de estado del proyecto.

## Cálculo de materiales y precios

Separar cantidad técnica, cantidad de compra, existencia disponible y cantidad imputada al proyecto. Ejemplo ilustrativo, no tarifa ni rendimiento universal: 5 m² con 10% de merma dan 5,5 m²; si una caja cubre 2,2 m², se compran 3 cajas (6,6 m²). Merma y cobertura deben venir de reglas revisadas y producto elegido.

Registrar conversiones por SKU. Cantidades fraccionarias requieren migración transversal de inventario, compras, ventas y movimientos; no basta con permitir decimales en el formulario de presupuesto.

Precios proceden del catálogo autorizado de la empresa o de ofertas documentadas de proveedor, con fecha y vigencia. Diferenciar costo, precio de venta, recargo sobre costo y margen sobre venta. El presupuesto usa instantáneas para no cambiar con el catálogo.

Definir cálculo y redondeo con Decimal en backend; reconciliar importes mostrados. El plan de pagos debe sumar el total, asignando cualquier residuo de redondeo de manera explícita. Tratamiento tributario parametrizado y validado en un trabajo separado; el PDF de presupuesto no constituye un DTE.

## Integración con la base actual

Reutilizar apps/customers, apps/inventory, apps/suppliers, apps/accounts y apps/system_settings mediante relaciones y servicios. Agregar apps/projects y apps/quotations como módulos del monolito Django, y una capa de asistencia IA desacoplada del proveedor.

Brechas identificadas en la revisión previa del repositorio:

- BusinessSettings es un singleton; aún no existe aislamiento por empresa. Introducir pertenencia empresarial, autorización y restricciones de unicidad por empresa de forma transversal, con migración del negocio existente y pruebas de aislamiento.
- El carrito POS exige stock suficiente. La cotización de obra necesita representar faltantes sin convertirlos en error.
- No existen reservas. Deben ser respetadas por ventas y operaciones de inventario compartidas.
- Confirmar Purchase aumenta stock. Separar orden y recepción para permitir entregas parciales, sin crear entradas por mercadería no recibida.
- Completar Sale descuenta stock. Si se separa entrega y cobro, adaptar este servicio para evitar doble salida.
- SaleItem exige Product; las líneas de servicios del presupuesto no deben convertirse en productos ficticios de inventario.
- El inventario y cantidades actuales son enteros. El nuevo flujo necesita unidades y conversiones verificables.
- No existe facturación electrónica. Presupuesto, comprobante interno y documento tributario son entidades distintas.
- Para obras ejecutadas por la empresa, registrar consumo con costo y proyecto; no crear venta ficticia a la propia empresa.

## Contrato de la asistencia IA

La salida debe ser un objeto validado por esquema: datos extraídos, preguntas, supuestos, partidas propuestas, candidatos de catálogo y pendientes. Toda referencia de producto debe verificarse contra productos accesibles para la empresa autenticada. Precios, cálculos finales, permisos y cambios operacionales pertenecen al backend.

Los textos de cliente, PDFs y notas son datos no confiables, nunca instrucciones para ampliar permisos o ejecutar operaciones. Una generación no confirma compras, modifica stock, emite la propuesta o envía mensajes. Las acciones se realizan por comandos de aplicación autorizados y auditados. Timeout o indisponibilidad de IA conserva la solicitud y permite edición manual.

## Primeros incrementos implementables

1. Base de empresas y expediente: aislamiento, cliente, solicitud por texto, medidas, pendientes y visita. Interfaz de captura y seguimiento.
2. Cotización manual integrada: partidas, materiales y servicios, catálogo, cantidades, versiones, revisión y PDF. Sirve también como comparación experimental.
3. Asistente: extracción estructurada, preguntas, plantillas iniciales de remodelación y propuestas enlazadas al catálogo. Comparar con cotización manual sobre los mismos casos.
4. Continuidad ERP: pedido, disponibilidad, reservas, abastecimiento, recepción y entrega/consumo. Posteriormente cronograma, avances y cobros por hitos.

La plataforma conserva soporte conceptual para construcción y demolición; la primera plantilla detallada usa el caso de remodelación aportado para verificar el proceso completo.

## Criterios de aceptación y evaluación académica

- Una solicitud incompleta se guarda y produce pendientes o una estimación claramente identificada, sin inventar medidas confirmadas.
- La visita actualiza el mismo proyecto y permite reconstruir los datos que cambiaron.
- Cada cantidad presupuestada remite a medición, regla o supuesto identificado.
- Un SKU inexistente o de otra empresa se rechaza; el material sigue pendiente de resolución.
- Cambiar catálogo o cliente no altera una cotización emitida; los cambios producen nueva versión.
- Líneas, categorías, total y hitos concilian con la política de redondeo.
- Generar un borrador no cambia stock. Reintentar comandos operacionales no duplica movimientos.
- La empresa A no puede consultar ni modificar proyectos, catálogos o documentos de la empresa B.
- Registrar autor, fecha y versión aceptada; confirmar aceptación no marca pagos como recibidos.
- Evaluar tiempo total hasta cotización validada, preguntas necesarias, omisiones, correcciones del maestro, correspondencias SKU y trazabilidad. Comparar proceso informal, versión manual integrada y versión asistida.
- Usar casos y referencia revisados por maestros; documentar tamaño y diversidad de la muestra y límites de generalización. No afirmar mejora antes de medirla.

## Siguiente unidad de desarrollo

Implementar el expediente de solicitud y levantamiento con una vista que reúna conversación, datos confirmados, pendientes y acción de generar borrador. Esa misma solicitud debe continuar hacia cotización, evitando recaptura después de la visita.
