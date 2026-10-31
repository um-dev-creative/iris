# Manual del operador de Iris

> Borrador. Cada sección la completa la tarea indicada; la versión final se consolida en F5-05.

Iris muestra en tiempo casi real cómo se están enviando los mensajes SMS, WhatsApp y Email: cuántos se enviaron, cuántos se entregaron, cuánto tardan y qué servicios tienen problemas.

## 1. Iniciar sesión
_Pendiente — F2-04._ Usuario y contraseña, mensajes de error y qué hacer.

## 2. Sesión expirada
_Pendiente — F2-06._

## 3. Cerrar sesión
_Pendiente — F2-07._

## 4. Página principal
_Pendiente — F3-05._ Qué significa cada indicador:

| Indicador | Qué mide | Cómo se calcula |
|---|---|---|
| Mensajes totales (24 h) | | |
| Tasa de entrega | | |
| Latencia promedio | | |
| Errores activos | | |

## 5. Buscar mensajes
_Pendiente — F3-06._ Filtros, búsqueda por id o destinatario, compartir una vista por enlace.

## 6. Estado de servicios
_Pendiente — F3-07._ Significado de *Operativo*, *Degradado* y *Caído*.

## 7. Actualización automática
_Pendiente — F3-08._

## 8. Qué hacer si no cargan los datos
_Pendiente — F3-09._

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
