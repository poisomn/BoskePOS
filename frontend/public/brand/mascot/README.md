# Mascota de BoskePOS

Animación aportada por el usuario en `Mascota árbol animado.zip`.
El arte base es el PNG transparente `Mascota robótica de árbol guiñando.png`.

`arbol-mascota.js` conserva los seis estados originales: `reposo`, `login`,
`cargando`, `error`, `exito` e `inactivo`. Se carga una sola vez en `index.html`
y se usa a través de `src/components/Mascot.jsx`.

Adaptaciones: fuente PNG transparente, actualización de `src`, limpieza de
listeners al desmontar, pausa fuera de pantalla o con pestaña oculta, y un
fotograma estático cuando el usuario prefiere movimiento reducido.

El wrapper React oculta el dibujo a lectores de pantalla. Cada uso debe incluir
texto que comunique el estado de la operación. `temporary` devuelve la mascota
a reposo después de 2400 ms.

## Integración en la aplicación

El logo conserva el texto de la marca y sustituye su árbol estático por la
mascota animada. También aparece junto al nombre del encabezado, en el carrito
vacío del POS y, en formato compacto, cuando el carrito contiene productos.

`mascotController` coordina los estados de todas estas instancias:

- `reposo`: estado habitual, respirando y parpadeando.
- `login`: guiño al entrar en el formulario o iniciar sesión correctamente.
- `cargando`: solicitudes en curso; espera a que termine la última solicitud.
- `error`: operación fallida o validación del POS que requiere atención.
- `exito`: escritura completada correctamente, como guardar o cobrar.
- `inactivo`: cinco segundos sin interacción; vuelve al interactuar.

Cargando tiene prioridad sobre los estados temporales, y estos sobre Inactivo.
El resultado de una operación se muestra durante 2400 ms después de terminar
las solicitudes pendientes. Las consultas normales terminan sin celebrar;
las cancelaciones tampoco muestran errores. El controlador solo almacena
estados visuales e identificadores opacos, nunca datos ni credenciales.

`MascotActivity` registra actividad de puntero, teclado, entrada y desplazamiento.
Al ocultar la pestaña se pausa la detección de inactividad y las animaciones
mantienen las protecciones de visibilidad y movimiento reducido descritas arriba.

Validación: `npm run test:mascot`, `npm run lint` y `npm run build`.
