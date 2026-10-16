# Interesados y plan de comunicación

## Matriz de interesados

| Interesado | Interés en el MVP | Qué necesita saber | Canal | Frecuencia |
|---|---|---|---|---|
| Product Owner | Alcance, prioridades, aceptación | Avance por fase, riesgos, demos, decisiones pendientes | Reporte semanal + demo de fin de sprint | Semanal |
| Operadores (usuarios finales) | Usar Iris para monitorear mensajería | Qué cambia en la pantalla, cómo se usa, cuándo hay UAT | Release notes + manual del operador | Por release |
| Equipo Mercury | Contrato de API, carga generada por Iris | Endpoints requeridos, volumen de llamadas, cambios de contrato | Reunión técnica + tickets | Al inicio de F2 y F3, y ante cambios de contrato |
| Equipo Backbone | Proxy `/bkd/api/v1` | Cambios en el proxy o en certificados | Correo | Ante cambios |
| Seguridad | Secretos, sesión, hardening | Exposición de secretos, diseño de sesión, matriz de controles | Ticket + revisión | F0-01, F2-01, F5-02 |
| DevOps / Plataforma | Despliegue y operación | Comandos de arranque, entornos, imagen, logs, health checks | Correo + runbook | F0-03, F1-05, F5-01, F5-03 |
| QA | Validación | Qué re-probar, escenarios automatizados, reportes de cobertura | Canal del equipo | Por tarea con impacto |
| Soporte | Atención a operadores | Runbook, problemas frecuentes, escalamiento | Runbook + sesión de traspaso | Antes del release |
| Equipo de desarrollo | Reglas de trabajo | Cambios en flujo, herramientas y reglas de merge | Canal del equipo + README | Al hacer merge |

## Reporte semanal

Se envía cada viernes al Product Owner y se publica en el canal del proyecto.

```md
# Iris · Reporte semanal — semana del <fecha>

**Fase actual:** F<n> · <nombre> — <en tiempo | en riesgo | atrasada>

## Completado
- <ID> <tarea> — <resultado visible>

## En curso
- <ID> <tarea> — <% o próximo paso>

## Próxima semana
- <ID> <tarea>

## Indicadores
| Cobertura frontend | Cobertura backend | CI en main | Tareas cerradas / total |
|---|---|---|---|
| <x> % | <y> % | verde/rojo | <n>/42 |

## Riesgos y decisiones pendientes
- <riesgo> — <mitigación> — <quién decide y para cuándo>
```

## Notas de versión (release notes)

Escritas para operadores, sin jerga técnica. Se generan desde `CHANGELOG.md` en [F5-07](F5-release/F5-07-release-v0-1-0.md) y se guardan en `docs/releases/`.

```md
# Iris <versión> — <fecha>

## Novedades
- <qué puede hacer ahora el operador>

## Mejoras
- <qué funciona mejor>

## Correcciones
- <qué problema dejó de ocurrir>

## Qué tienes que hacer
- <acciones necesarias, p. ej. iniciar sesión con tu usuario de Mercury>

Manual del operador: docs/user/manual-operador.md
```

## Comunicaciones clave del MVP

| Fecha estimada | Evento | Destinatarios | Tarea |
|---|---|---|---|
| 19 oct 2026 | Kickoff: roadmap, dónde ver cambios | Todos | F0-10 |
| 19 oct 2026 | Posible exposición de secretos y rotación | Seguridad | F0-01 |
| 26 oct 2026 | Revisión del contrato de monitoreo | Mercury, Product Owner | F3-01 |
| 13 nov 2026 | Demo de autenticación | Product Owner | F2-07 |
| 27 nov 2026 | Demo con datos reales | Product Owner, Mercury | F3-09 |
| 27 nov 2026 | Invitación a UAT y manual | Operadores | F5-05, F5-06 |
| 3 dic 2026 | Traspaso a Soporte | Soporte, DevOps | F5-07 |
| 4 dic 2026 | Lanzamiento v0.1.0 | Todos | F5-07 |
