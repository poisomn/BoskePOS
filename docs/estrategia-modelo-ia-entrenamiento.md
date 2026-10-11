# BoskePOS: selección del motor IA y estrategia de adaptación

Fecha de revisión documental: 11 de octubre de 2026.
Estado: propuesta técnica y experimental. Ningún modelo ha sido integrado, probado o entrenado como parte de este documento.

## Decisión inicial propuesta

Usar GPT-6.1 Sol por API como candidato inicial para extracción de solicitudes, preguntas y propuestas de partidas. Compararlo con GPT-6 Luna en los mismos casos. Son candidatos documentados, no ganadores de un benchmark de BoskePOS ni una comparación exhaustiva del mercado.

Si se requiere una contribución que incluya modificación de parámetros, experimentar con gpt-oss-20b y ajuste supervisado mediante LoRA, manteniendo la recuperación de catálogo y los cálculos del ERP. Medir antes/después sobre el mismo modelo base. Su adopción depende de calidad observada, recursos de GPU y costo de operación.

GPT-6.1 Sol y GPT-6 Luna admiten salidas estructuradas y llamadas a funciones; sus fichas no admiten fine-tuning. La guía de fine-tuning de OpenAI indica que su plataforma ya no está disponible para nuevos usuarios. No comprometer una fase académica de entrenamiento sobre esa plataforma sin verificar acceso y continuidad.

## Qué significa crear la IA

El modelo base es una red neuronal previamente entrenada por su proveedor. BoskePOS construye un sistema especializado alrededor de ese modelo: instrucciones, ejemplos, recuperación de información, herramientas, reglas, interfaz, trazabilidad y evaluación.

| Técnica | ¿Modifica parámetros? | Uso propuesto |
|---|---|---|
| Prompt | No | Definir responsabilidades, formato y manejo de incertidumbre |
| Ejemplos en contexto | No | Mostrar cómo interpretar solicitudes y reconocer datos faltantes |
| Recuperación de información / RAG | No | Incorporar fichas, partidas y antecedentes pertinentes |
| Consultas al ERP | No | Obtener productos, precios y disponibilidad de la empresa |
| Ajuste supervisado / SFT | Sí | Aprender patrones de extracción y propuestas desde pares entrada-salida |
| LoRA | Sí, adapta parámetros adicionales | Reducir parámetros entrenables frente al ajuste completo |
| Preentrenamiento desde cero | Sí | Crear capacidades generales; fuera de la estrategia propuesta por costo y volumen de datos |

No denominar entrenamiento a subir PDFs, configurar un asistente, cambiar un prompt o agregar documentos a un índice. Una corrección del maestro no modifica automáticamente el modelo: se registra, revisa y eventualmente entra a un entrenamiento posterior.

## Separación de responsabilidades

1. Modelo generativo: interpretar texto, identificar preguntas, proponer partidas y candidatos.
2. Base de conocimiento: plantillas de trabajo y criterios revisados, con origen y versión.
3. ERP: catálogo autorizado, precios, stock y operaciones transaccionales.
4. Motor determinístico: unidades, conversiones, cantidades, redondeos y totales.
5. Revisor: resolver supuestos y aprobar presupuesto.

Los precios y el inventario cambian; se consultan durante cada operación, no se enseñan como hechos permanentes mediante entrenamiento. La búsqueda inicial puede ser SQL/textual por SKU, nombre y atributos. Agregar embeddings y recuperación semántica solo si mejora la correspondencia en las pruebas. Un formato JSON válido no garantiza contenido correcto.

## Dataset de dominio

Unidad: solicitud y/o conversación con salida estructurada revisada por expertos. El PDF final no basta si no conserva el texto que lo originó, mediciones, supuestos y decisiones.

Campos sugeridos:

- Identificador del caso y del proyecto de origen.
- Tipo de trabajo y contexto disponible en ese momento.
- Solicitud original anonimizada y turnos pertinentes.
- Medidas explícitas, unidades y origen.
- Datos faltantes y preguntas esperadas.
- Partidas esperadas, exclusiones y supuestos.
- Materiales genéricos y atributos técnicos; candidatos obtenidos del catálogo contextual cuando corresponda.
- Salida corregida y justificación breve observable de correcciones.
- Revisores y estado de adjudicación.
- Procedencia real o sintética y autorización de uso.
- Versión del esquema y división train/validation/test.

Incluir expresiones informales, solicitudes completas e incompletas, ambigüedades, cambios posteriores, contradicciones y trabajos fuera de las plantillas disponibles. Evitar que todo el conjunto sea una reformulación de un único presupuesto.

Arranque orientativo: 30–50 casos revisados para construir y probar el esquema. Objetivo posterior de 200–500 ejemplos diversos para un piloto de ajuste fino, sujeto a disponibilidad y curvas de aprendizaje. Estas cifras son propuestas de planificación, no mínimos científicos ni garantía de desempeño.

Diego y otros maestros revisan significado y partidas; el equipo valida estructura, unidades y consistencia. Revisar una muestra con dos expertos y resolver desacuerdos. Los ejemplos sintéticos pueden ampliar variantes, pero requieren revisión y una evaluación separada en casos reales.

## Ejemplo de objetivo de aprendizaje

Entrada: «Quiero remodelar una pieza de 5 m², cambiar cerámico por flotante y revestir los muros».

Salida esperada: superficie de piso 5 m²; retiro y reemplazo solicitados; superficie de muro desconocida; preguntar muros incluidos, largo, altura, vanos, material y terminación. No convertir 5 m² de piso en 15 m² de muro confirmado.

La tarea se acota a interpretar y proponer. Un modelo especializado no constituye un calculista ni adquiere automáticamente competencia técnica para cualquier obra o demolición.

## Entrenamiento supervisado con LoRA

1. Seleccionar y fijar revisión del modelo base y tokenizer; documentar licencia y entorno.
2. Preparar pares de entrada y salida estructurada correctos. Conservar solo información disponible al momento de la entrada.
3. Dividir por proyecto de origen; propuesta inicial 70/15/15. Todas las variantes del mismo proyecto quedan en una única división.
4. Separar además obras realizadas por expertos o empresas no representados en entrenamiento cuando sea posible para medir generalización.
5. Entrenar adaptadores LoRA con Transformers, PEFT y TRL; conservar modelo base y adaptadores versionados. Verificar configuración específica de la arquitectura MoE.
6. Ajustar tasa de aprendizaje, épocas, longitud máxima, lote y rango LoRA usando validación. Registrar semilla, versiones, consumo GPU y configuración.
7. Vigilar pérdida de entrenamiento y validación. Seleccionar checkpoint según métricas de tarea y evitar sobreajuste.
8. Evaluar en test reservado una vez cerradas las decisiones. No ajustar prompts o datos con ese test.
9. Comparar con modelo base bajo las mismas condiciones de recuperación, instrucciones, catálogo y reglas.
10. Integrar el modelo seleccionado mediante una interfaz de proveedor intercambiable y revisión humana.

LoRA permite entrenar un subconjunto de parámetros adaptativos; no elimina las necesidades de GPU. El tutorial oficial de gpt-oss usa una H100 de 80 GB; esa configuración no es una exigencia universal ni una estimación de nuestro trabajo. Determinar recursos con un ensayo de memoria y tiempos, y separar necesidades de inferencia de las de entrenamiento.

## Diseño de evaluación

Experimento de selección: Sol y Luna con las mismas solicitudes, contexto y validación.

Experimento de adaptación: gpt-oss base frente a gpt-oss ajustado, con idéntica recuperación. Separar el efecto del fine-tuning del efecto de añadir documentos o reglas. Si se desea medir ambos, comparar base sin recuperación, base con recuperación y ajustado con la misma recuperación.

| Medida | Definición |
|---|---|
| Extracción | Exactitud por campo, normalización de unidades y conservación de incertidumbre |
| Preguntas | Cobertura de pendientes importantes y preguntas innecesarias |
| Partidas | Omisiones y agregados injustificados frente a referencia experta |
| Correspondencia SKU | Candidato correcto o decisión correcta de dejar pendiente |
| Trazabilidad | Referencias válidas para datos y propuestas |
| Invención | Datos confirmados sin respaldo; separar por gravedad |
| Revisión | Tiempo y magnitud de correcciones del maestro |
| Operación | Latencia, tokens, reintentos y costo por presupuesto validado |

Registrar errores antes y después de la validación del backend para no atribuir al modelo correcciones realizadas por reglas. Repetir casos seleccionados para medir variabilidad. Publicar tamaño, composición y límites de la muestra; evitar presentar resultados del caso de habitación como desempeño general en construcción.

## Defensa académica propuesta

«Se construirá un asistente de presupuestación sobre un modelo preentrenado. La selección se justificará mediante evaluación de extracción, preguntas, partidas, costo y latencia. El conocimiento variable se recuperará del ERP. Se diseñará un conjunto de ejemplos revisado por maestros y se evaluará el efecto de un ajuste supervisado LoRA frente al mismo modelo sin ajustar. El backend realizará cálculos y validaciones, manteniendo trazabilidad y revisión profesional».

Este texto describe un plan, no un resultado conseguido. La observación del profesor sobre entrenamiento no basta para concluir que la rúbrica exige preentrenar o ajustar parámetros; distinguir la obligación formal de la decisión técnica.

## Fuentes oficiales consultadas

- GPT-6.1 Sol: https://developers.openai.com/api/docs/models/gpt-6.1-sol
- GPT-6 Luna: https://developers.openai.com/api/docs/models/gpt-6-luna
- gpt-oss-20b: https://developers.openai.com/api/docs/models/gpt-oss-20b
- Ajuste con gpt-oss y Transformers: https://developers.openai.com/cookbook/articles/gpt-oss/fine-tune-transfomers
- Estado del servicio de ajuste supervisado: https://developers.openai.com/api/docs/guides/supervised-fine-tuning
- Evaluación y optimización: https://developers.openai.com/api/docs/guides/model-optimization
- Límites de salidas estructuradas: https://developers.openai.com/api/docs/guides/structured-outputs

Las fichas documentan capacidades generales. Ninguna acredita desempeño en presupuestación de obras de BoskePOS. Revalidar disponibilidad y condiciones antes de contratar recursos o iniciar experimentos.
