# Centro de Atención (FASE 8C)

## ¿Qué es?

El **Centro de Atención** es el lugar donde Panitas te dice qué requiere tu
acción. No es una bandeja de notificaciones ni un log de eventos: es una lista
de **situaciones** deduplicadas y priorizadas, derivadas de reglas deterministas
sobre los datos reales de tu negocio.

> "Panitas encontró algo importante que debes revisar."

| | |
|---|---|
| Ruta | `/dashboard/atencion` |
| Feature | `attention_center` (Panitas Negocios Plus) |
| API | `GET/PATCH /api/attention`, `GET /api/attention/overview`, `GET/PUT /api/attention/settings` |
| Módulo | `src/lib/attention/` |
| UI | `src/components/attention/` |

## Concepto clave: situación ≠ evento

Un evento (`product.updated`, `sale.created`, `conversation.message.created`)
es un hecho momentáneo. Una **situación** es un estado que requiere tu decisión:

- ✅ Producto agotado (stock = 0 ahora)
- ✅ Cuota vencida (fecha de pago en el pasado)
- ✅ Canal WhatsApp desconectado (no se reciben pedidos)
- ❌ "El producto fue editado" (evento, no requiere acción)
- ❌ "Se vendió un producto" (operación normal)

## Tipos de situaciones (12 reglas)

| Tipo | Regla | Prioridad |
|---|---|---|
| `inventory.out_of_stock` | stock ≤ 0 | alta |
| `inventory.low_stock` | 0 < stock ≤ 5 ("está por agotarse") | media |
| `inventory.no_movement` | activo sin movimientos en 30 días | baja |
| `credit.overdue` | cuota pendiente con vencimiento pasado | alta |
| `credit.upcoming` | cuota pendiente que vence en ≤ 3 días | media |
| `supplier.overdue` | factura con saldo y vencimiento pasado | alta |
| `supplier.pending_balance` | factura con saldo pendiente | media |
| `order.delayed` | en flujo (confirmado/preparando) sin avance ≥ 48 h; enviado ≥ 5 días | media |
| `order.pending` | sin confirmar ni pagar ≥ 24 h (excluye POS) | baja |
| `conversation.pending` | sin respuesta tras 15 min de gracia; urgente > 48 h | media/alta |
| `channel.disconnected` | conexión de canal desconectada | crítica |
| `channel.error` | conexión de canal con error | alta |

Un producto agotado **no** genera además "por agotarse". Una conversación con
3 mensajes genera **un solo item**. Cinco productos por agotarse aparecen como
**un grupo**: "5 productos por agotarse".

## Ciclo de vida de un item

```
new ──► acknowledged ──► resolved / dismissed
 │                          ▲
 └──► snoozed ──(vence)────┘ (vuelve a new si la situación persiste)
```

- **new** — pendiente de revisar.
- **acknowledged** — marcado como visto (sigue visible).
- **snoozed** — oculto hasta `snoozedUntil` (1 h / hasta mañana / semana). Al
  vencer, si la situación sigue existiendo, vuelve a `new`.
- **resolved** — la situación desapareció de los datos reales (automático) o la
  resolviste tú. Un item `resolved` libera su clave: si la situación reaparece,
  se crea uno **nuevo** (nueva ocurrencia).
- **dismissed** — decidiste ignorarla. **Se respeta** mientras la situación
  persista; no se recrea.

La **resolución automática es conservadora**: solo ocurre cuando es seguro
(la situación ya no existe en los datos: la cuota se pagó, respondiste la
conversación, se repuso el stock). Nunca por opinión ni predicción.

## Deduplicación

Cada item tiene una `dedupeKey` persistente: `` `${type}:${entityId}` ``.

- Un item abierto (`new`/`acknowledged`/`snoozed`) impide crear otro mientras la
  situación persista.
- `resolved` libera la key (nueva ocurrencia al reaparecer).
- `dismissed` bloquea la recreación mientras la situación persista.

## Cómo se generan (motor de reglas)

```
Evento de negocio ──► EventBus ──► listener (throttle 30 s por tienda)
                                        │
                                        ▼
                              AttentionService.sync(storeId)
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  ▼                     ▼                     ▼
            data port (queries)   detectores puros   preferencias del negocio
                  │                     │                     │
                  └─────────────────────┴─────────────────────┘
                                        │
                                        ▼
                     dedupe + reconciliación (crea/resuelve/reabre)
                                        │
                                        ▼
                          AttentionItems (BD) ──► eventos attention.item.*
```

- Los eventos **solo disparan** el re-sync (throttled). Nunca crean items
  directamente.
- Los items se crean **exclusivamente** por reglas deterministas sobre datos
  reales (los `detectors`).
- El listener se registra en `src/lib/events/event-listeners/`.

## Acciones y deep links

Cada item incluye un deep link al módulo donde se resuelve (ver producto,
ver crédito, responder conversación, revisar canal…). Los deep links provienen
del catálogo `src/lib/attention/rules.ts` y se aplican automáticamente si el
detector no definió uno propio.

## Preferencias por negocio

`/api/attention/settings` (`PUT` requiere admin/manager):

- **Tipos habilitados** por dominio (inventario, créditos, proveedores,
  pedidos, mensajes, canales).
- **Prioridad mínima**: todo / media+ / alta+crítica / solo críticas.
- **Horario de silencio** (22:00–08:00 por defecto): aplica a canales externos
  de notificación (email/WhatsApp/push), que en v1 **no envían nada**
  automáticamente (interfaz preparada, canal noop).

## Integraciones

- **Sidebar**: item "Centro de Atención" con badge del conteo abierto
  (`/api/attention/overview`, polling 60 s).
- **Business Monitor**: tarjeta en el área Monitor del BIC que muestra el
  conteo por prioridad cuando hay situaciones abiertas (`AttentionMonitorCard`).
- **Agente IA**: tools `attention.summary` y `attention.getPending`
  (permiso `report.read`). La IA explica y resume lo que las reglas detectaron;
  **no puede crear, resolver ni descartar alertas**.

## Seguridad y aislamiento

- Multi-tenant estricto: todas las consultas y acciones filtran por `storeId`
  (una tienda jamás ve ni muta items de otra).
- Lectura: admin/manager/seller/viewer. Escritura (acciones y preferencias):
  admin/manager.
- Feature gating: `hasFeature(planRef, "attention_center")` con
  `FeatureLockScreen` en la página y en el sidebar.
