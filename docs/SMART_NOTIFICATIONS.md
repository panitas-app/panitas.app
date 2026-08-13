# Smart Notifications (FASE 8C)

## Principio

Panitas **no spamea**: solo notifica situaciones que requieren tu acción, no
eventos. Un mensaje entrante, una venta o una edición de producto son operación
normal; una cuota vencida o un canal desconectado sí merecen tu atención.

La inteligencia está en **qué** notificar (reglas deterministas sobre datos
reales), **cuándo** (prioridad mínima + horario de silencio) y **cómo**
(agrupación + dedup, para no repetir lo mismo mil veces).

## Qué se notifica

Cada `AttentionItem` (ver `docs/ATTENTION_CENTER.md`) es una notificación
potencial. Las reglas determinan la **prioridad** en una sola escala:

| Prioridad | Uso | Ejemplo |
|---|---|---|
| `critical` | Acción inmediata | Canal desconectado (no se reciben pedidos) |
| `high` | Urgente | Producto agotado, cuota vencida, conversación urgente |
| `medium` | Requiere seguimiento | Stock bajo, pedido retrasado, cuota por vencer |
| `low` | Menor | Producto sin movimiento, pedido por confirmar |

Regla de oro: **no abusar de `critical`**. Solo se usa para situaciones que
bloquean operación real.

## Filtros

El negocio controla la notificación desde sus preferencias:

1. **Tipos habilitados** — si deshabilitas "Créditos", ninguna cuota genera
   alerta.
2. **Prioridad mínima** — "solo altas y críticas" descarta media/baja.
3. **Horario de silencio** — ventana (por defecto 22:00–08:00) en la que no se
   envían notificaciones externas. Soporta ventanas que cruzan medianoche
   (22:00→08:00) y ventanas del mismo día (09:00→17:00).

## Arquitectura de canales externos

En v1 **no se envían notificaciones automáticas** (ni email, ni WhatsApp, ni
push). La arquitectura está preparada:

```
AttentionService.sync
   └─► notifyNew(item)
        └─► FilteredAttentionNotifier([canales], { minPriority })
              ├─ ¿prioridad ≥ mínima?  ── no ──► no envía
              ├─ ¿horario de silencio? ── sí ──► no envía
              └─► channel.send(notification)   (email / WhatsApp / push…)
```

- `ExternalAttentionChannel` — interfaz de un canal real.
- `FilteredAttentionNotifier` — aplica prioridad mínima y quiet hours.
- `NoopExternalAttentionChannel` — canal por defecto (no hace nada).

Para activar un canal real en el futuro solo hay que implementar
`ExternalAttentionChannel` e inyectarlo en `attentionService` (sin cambiar el
motor). En `src/lib/attention/app.ts` el notificador actual es un
`FilteredAttentionNotifier([], { minPriority: "high" })`.

## Cómo se comporta en la práctica

| Situación | ¿Notifica? | Por qué |
|---|---|---|
| Producto se agota | ✅ Sí (1 item) | Situación que requiere reposición |
| Se vendió un producto con stock sano | ❌ No | Operación normal |
| Llegan 3 mensajes sin responder | ✅ Sí (**1 item**) | Una conversación pendiente, no 3 alertas |
| La cuota se pagó | 🔄 El item se resuelve solo | La situación desapareció de los datos |
| 5 productos por agotarse | ✅ Sí (**1 grupo**) | Se agrupan por tipo |
| Usuario ignora una alerta | 🙈 Se respeta el `dismissed` | Su decisión prevalece sobre los datos |
| El canal vuelve a conectarse | 🔄 El item se resuelve solo | La situación desapareció |

## Eventos de dominio

Cuando un item cambia de estado se emite un evento de dominio
(`attention.item.created|acknowledged|resolved|dismissed|snoozed`) con
`source: "attention-center"`, listo para auditoría, feeds o notificaciones
futuras sin tocar el motor.

## Anti-patrones evitados

- ❌ Una alerta por cada mensaje/venta → ✅ un item por situación.
- ❌ "Se agotará en 7 días" (predicción) → ✅ "está por agotarse" (dato real).
- ❌ Notificar por opinión de la IA → ✅ solo datos reales (reglas).
- ❌ Cerrar la alerta porque "seguro ya se resolvió" → ✅ se resuelve solo
  cuando la situación desaparece de los datos.
