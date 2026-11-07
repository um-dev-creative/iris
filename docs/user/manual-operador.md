# Manual del operador de Iris

> Borrador. Cada sección la completa la tarea indicada; la versión final se consolida en F5-05.

Iris muestra en tiempo casi real cómo se están enviando los mensajes SMS, WhatsApp y Email: cuántos se enviaron, cuántos se entregaron, cuánto tardan y qué servicios tienen problemas.

## 1. Iniciar sesión
_Pendiente — F2-04._ Usuario y contraseña, mensajes de error y qué hacer.

## 1 bis. Crear una cuenta
En la pantalla de inicio de sesión pulsa **Crear una cuenta** y completa el formulario. Te enviaremos un código de 6 dígitos al correo, válido por 15 minutos; escríbelo para activar la cuenta. Si no te llega, pulsa **Enviar otro código**. Tienes 3 intentos por código.

## 2. Sesión expirada
_Pendiente — F2-06._

## 3. Cerrar sesión
_Pendiente — F2-07._

## 4. Página principal
Los indicadores salen de las campañas de Mercury. Si aún no hay datos, la página lo indica en lugar de mostrar cifras.

| Indicador | Qué mide | Cómo se calcula |
|---|---|---|
| Mensajes totales | Destinatarios de las campañas | Suma de todas las campañas |
| Tasa de entrega | Mensajes que llegaron | Entregados ÷ (entregados + fallidos) |
| Fallidos | Mensajes que no se entregaron | Suma de todas las campañas |
| Pendientes | Mensajes en curso | Suma de todas las campañas |

La tendencia compara con la lectura anterior, por eso no aparece en la primera.

## 5. Buscar campañas
En **Campañas** busca por nombre y filtra por canal y estado. Una campaña está **En curso** si le quedan mensajes por enviar, **Entregada** si terminó con entregas y **Fallida** si terminó sin ninguna.

## 6. Estado de servicios
Iris comprueba Mercury y Backbone en cada actualización y muestra la latencia medida. *Operational*: responde bien. *Degraded*: responde, pero tarda más de un segundo. *Down*: no responde o informa un fallo. Si ves *Down* en Backbone con una latencia baja (decenas de ms) mientras funciona, el sondeo está apuntando a una ruta protegida: Iris debe usar `BACKBONE_HEALTH_PATH=/actuator/health/readiness`, la sonda pública de backbone-rest.

## 7. Actualización automática
Los datos se actualizan cada 30 segundos mientras la pestaña está visible. El botón de actualizar lo hace al momento.

## 8. Qué hacer si no cargan los datos
Un aviso indica el problema. Si dice que no se pudieron actualizar, Iris reintenta sola y conserva la última lectura. Si dice que Mercury no entregó las campañas, revisa el estado de los servicios en la misma página.

## 8 bis. Clientes de login (administración)

**Dashboard → Login clients.** Aquí se gestionan los servicios backend (smartkin-backend, zerobound-rest…) que pueden pedir un token a Mercury. El **alias es el nombre del servicio**, no el de una persona.

- **Nuevo cliente:** alias (letras, números, `.`, `_`, `-`), descripción opcional y contraseña opcional (12 a 72 caracteres ASCII, sin espacios). Si la dejas vacía, Mercury genera una segura.
- **La contraseña generada se muestra una sola vez.** Cópiala y configúrala en el servicio (smartkin-backend: `MERCURY_LOGIN_ALIAS` y `MERCURY_LOGIN_PASSWORD` en su Vault). Mercury guarda solo un hash: si la pierdes, rota la contraseña.
- **Rotar contraseña:** genera una nueva, la anterior deja de valer y el cliente se reactiva. Hay que entregar la nueva al servicio.
- **Desactivar / Activar:** apaga o enciende el servicio sin perder el registro. Es la forma correcta de impedirle el acceso.
- **Eliminar:** borra el registro. Si el alias sigue en la configuración estática de Mercury podrá iniciar sesión por ahí.
- Cada acción pide confirmación. Si ves «No tienes permiso…», falta el permiso `LOGIN_CLIENT_MANAGE` en Backbone para tu usuario en la aplicación de Iris (y que Mercury tenga `LOGIN_CLIENTS_ADMIN_APPLICATION_ID`).

## 9. Preferencias
_Pendiente — F5-04._ Tema claro u oscuro.

## 10. Preguntas frecuentes
_Pendiente — F5-06 (a partir de la UAT)._

## Glosario
_Pendiente — F5-05._

## Campañas

En **Campañas** (menú lateral) ves las campañas que has creado, con su canal, su estado y cuántos mensajes se han entregado o han fallado.

```mermaid
flowchart LR
    A["Nueva campaña"] --> B{"¿Cuándo se envía?"}
    B -->|"Más adelante"| C["Programada"]
    B -->|"Aún no sé"| D["Borrador"]
    C --> E["Seguimiento del avance"]
    D -->|"Editar y programar"| C
    E --> F["Pausar o reanudar"]
    E --> G["Eliminar"]
```

### Crear una campaña

1. Pulsa **Nueva campaña**.
2. Escribe el **nombre** y elige el **canal** (correo, Telegram…).
3. Elige la **plantilla** que se enviará. Si tu cuenta no puede ver la lista de plantillas, escribe su id.
4. Pega los **destinatarios**, una persona por línea (`correo,nombre`), o pulsa **Importar CSV**. Los repetidos se descartan solos y el contador te dice cuántos quedan.
5. Si la plantilla usa datos variables, escríbelos en **Parámetros** (`nombre=Ana`, uno por línea).
6. Elige **Borrador** o **Programada**. Una campaña programada necesita fecha y hora futuras.
7. Pulsa **Crear campaña**.

### Seguir, pausar y eliminar

- La lista muestra una barra con el avance de cada campaña y puedes filtrar por nombre, estado o canal.
- **Ver** abre el detalle con enviados, entregados, fallidos y pendientes; se actualiza solo cada 15 segundos.
- **Pausar** detiene los envíos que aún no han salido (lo ya enviado no se puede detener). **Reanudar** los retoma.
- **Eliminar** pide confirmación y no se puede deshacer.
- **Editar** solo está disponible mientras la campaña es borrador o está programada. Si dejas vacío el cuadro de destinatarios se conservan los actuales.

### Mensajes que puedes ver

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| «No puedes … esta campaña: solo quien la creó puede hacerlo…» | Otra persona creó la campaña, o a Iris le falta permiso de escritura en Mercury. | Pide a quien la creó que lo haga, o avisa al administrador. |
| «Mercury rechazó los datos…» | La plantilla, el canal o los destinatarios no son válidos. | Revisa el id de la plantilla y que el canal esté habilitado. |
| «La campaña ya no existe» | Alguien la eliminó. | Actualiza la lista. |
| «Elige una plantilla.» | Aún no has seleccionado ninguna plantilla de la lista. | Elígela en el selector. |
| «La gestión de campañas no está configurada» | Falta configurar la aplicación en Iris. | Avisa al administrador. |
| «No tienes permiso para ver las campañas» | Tu cuenta no puede leer las campañas. | Avisa al administrador. |

## Plantillas

En **Plantillas** (menú lateral) escribes y editas el texto de los mensajes que envía Mercury, en **Markdown** o en **HTML**, y ves cómo quedará antes de guardar.

Cada aplicación (Iris, ZeroBound, SmartKin, LatinHub…) tiene sus propias plantillas. Primero **eliges la aplicación**, después ves **sus plantillas** y de ahí abres el **editor**; en la parte de arriba del editor y de la lista, la ruta de migas (**Aplicaciones / nombre de la aplicación**) te permite volver un paso. Si eliges una aplicación que tu cuenta no puede gestionar, Iris te lo dice (necesitas el permiso `TEMPLATE_MANAGE` en esa aplicación).

```mermaid
flowchart LR
    A["Nueva plantilla"] --> B["Escribir el contenido"]
    B --> C["Vista previa con parámetros de ejemplo"]
    C -->|"hay errores"| B
    C -->|"todo bien"| D["Guardar"]
    D --> E["Usarla en una campaña"]
```

### Crear una plantilla

1. Pulsa **Nueva plantilla**.
2. Escribe la **descripción** y elige el **tipo** y la **severidad**.
3. Elige el **formato**: Markdown (más sencillo: títulos, negritas, listas, enlaces) o HTML (control total del diseño). Iris propone el nombre del **archivo**; puedes cambiarlo.
4. Escribe el contenido. Donde quieras un dato variable escribe `${nombre}`; por ejemplo `Hola ${name}`.
5. A la derecha ves la **vista previa**. En **Parámetros de ejemplo** escribes valores de prueba (`name=Ana`); Iris agrega solo los parámetros que detecta.
6. Pulsa **Guardar**.

### Editar, desactivar y cuidar el trabajo

- **Editar** abre la plantilla con su contenido. El botón **Guardar** se enciende cuando hay cambios; si intentas salir sin guardar, Iris pregunta.
- Si otra persona guardó la misma plantilla mientras la editabas, Iris lo avisa y te ofrece **Recargar** (tus cambios se pierden, cópialos antes si los necesitas).
- **Desactivar** (en la lista) pide confirmación: la plantilla deja de poder usarse en campañas nuevas; los mensajes y campañas anteriores no cambian.
- Las plantillas del sistema (verificación de cuenta, avisos de ZeroBound y SmartKin) se abren **bloqueadas**: otros servicios dependen de ellas. Para cambiarlas marca la casilla «Entiendo que otros servicios dependen de esta plantilla»; el original queda guardado en el historial.

### Historial y restaurar

Cada vez que guardas, Iris conserva esa versión (las últimas 50). En una plantilla ya guardada pulsa **Ver historial**:

- **Comparar** muestra, línea por línea, qué cambió entre esa versión y lo que tienes en el editor (`+` agregado, `-` quitado).
- **Restaurar** vuelve a esa versión. No borra nada: la versión restaurada se guarda como una versión nueva, así que también puedes deshacer la restauración. Si tenías cambios sin guardar, se pierden.
- La versión **Original** es el contenido que tenía la plantilla antes de que la editaras por primera vez desde Iris.

### Mensajes que puedes ver

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| «Línea 3, columna 5: …» | El contenido tiene un error de sintaxis (por ejemplo una etiqueta sin cerrar). | Pulsa **Ir a la línea** y corrígelo; no se puede guardar hasta entonces. |
| «Alguien guardó la plantilla antes que tú» | Otra persona guardó una versión nueva. | Pulsa **Recargar** y vuelve a hacer tu cambio. |
| «El contenido supera 262144 bytes» | La plantilla es demasiado larga (256 KB). | Acórtala o quita imágenes incrustadas. |
| «No tienes permiso para administrar las plantillas» | Tu cuenta no tiene el permiso de plantillas. | Avisa al administrador. |
| «No tienes permiso para cambiar esta plantilla, o es una plantilla del sistema y falta confirmarlo» | No tienes el permiso, o intentaste cambiar una plantilla del sistema sin marcar la casilla de confirmación. | Marca la casilla (plantillas del sistema) o pide el permiso al administrador. |
| «La gestión de plantillas no está configurada» | Falta configurar la aplicación en Iris. | Avisa al administrador. |

## Usuarios y accesos

En **Usuarios** eliges una aplicación y ves sus usuarios. Desde ahí puedes:

- **Dar acceso a otra aplicación:** pulsa *Accesos* en el usuario, elige la aplicación y el rol (solo salen los roles de esa aplicación) y pulsa *Dar acceso*. Si ya tenía un rol allí, se cambia. Puedes dar acceso a todas las aplicaciones que quieras.
- **Quitar un acceso:** *Quitar* junto a la aplicación. La aplicación principal del usuario no se puede quitar.
- **Crear un usuario:** *Nuevo usuario*, con sus datos y su rol en la aplicación elegida.

Quién ve qué en **Plantillas**: un administrador de la plataforma ve todas las aplicaciones; un administrador de plantillas solo las aplicaciones donde tiene un rol con `TEMPLATE_MANAGE`.

```mermaid
flowchart LR
  A[Ana: plantillas de SmartKind y LatinHub] --> S[Plantillas muestra solo esas dos]
  L[Luis: administrador de la plataforma] --> T[Plantillas muestra todas]
```

