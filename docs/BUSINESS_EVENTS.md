# BUSINESS EVENTS — Guía de eventos de dominio (FASE 5H)

## Cómo publicar un evento desde un servicio

```ts
import { fireDomainEvent } from "@/lib/events"

fireDomainEvent({
  type: "sale.created",          // del catálogo EVENT_META
  data: { orderId, total },      // payload del evento
  aggregateId: order.id,         // entidad sobre la que actúa
  aggregateType: "Order",        // se infiere del catálogo si se omite
  tenantId: ctx.storeId,         // OBLIGATORIO (aislamiento multi-tenant)
  actorId: ctx.userId,           // quién ejecutó la acción
  source: "order.service",       // módulo de origen
})
```

- `fireDomainEvent` es **fire-and-forget**: nunca bloquea el flujo del servicio
  ni propaga errores.
- Si necesitas el reporte (para tests o telemetría), usa `await publishDomainEvent(...)`.

## Publicado por cada módulo (integración actual)

| Módulo | Eventos publicados |
|---|---|
| `order.service.ts` | `sale.created`, `sale.completed`, `sale.cancelled`, `order.created`, `order.completed`, `order.cancelled`, `product.stock.changed` (por ítem, reason `sale`), `inventory.low_stock`, `credit.created`, `customer.credit.created` (si hay crédito/cuotas) |
| `product.service.ts` | `product.created`, `product.updated`, `product.deleted`, `product.price.changed`, `product.stock.changed` (reason `product_edit`) |
| `customer.service.ts` | `customer.created`, `customer.updated` |
| `expense.service.ts` | `expense.created`, `expense.updated` |
| `inventory.service.ts` | `product.stock.changed` (increase/decrease/adjustment), `inventory.low_stock` |
| `agenda.service.ts` | `appointment.created`, `appointment.cancelled` (tenant = `negocioId`) |
| `conversation.service.ts` | `conversation.started`, `conversation.message.created`, `conversation.deleted` |
| `api/installments` (PATCH) | `credit.payment.created`, `credit.completed` (cuando no quedan cuotas pendientes) |
| `api/cron/installment-reminders` | `credit.overdue` (por pedido con cuotas vencidas) |
| `lib/conversation/engine.ts` | `conversation.intent.detected`, `assistant.context.updated`, `assistant.memory.updated` |
| `lib/agent/tools/domains/analytics.ts` | `assistant.monitor.updated` (cuando el monitor 4B genera resumen) |
| `legacy-bridge.ts` (producción) | Republica los `LEGACY_EVENT_NAMES` del EventService antiguo |

## Listeners del sistema (`registerEventListeners`)

| Listener | Qué hace | Dependencia |
|---|---|---|
| `audit-log` | Persiste el reporte de cada despacho (resultado/duración/estado) | `EventHistoryStore` (Prisma en prod) |
| `analytics` | Contadores agregados por tienda (ventas, ingresos, gastos, créditos, stock bajo…) | — (en memoria) |
| `dashboard` | Feed de actividad reciente por tienda con resumen legible | — (en memoria) |
| `business-monitor` | Refresca el monitor 4B con throttle por tienda (5s) cuando cambia el negocio | `refresh` inyectable |
| `recommendations` | Al `assistant.monitor.updated` genera recomendaciones 4D y publica `assistant.recommendation.created` | `generate` inyectable |
| `business-memory` | Observa eventos clave (precio, créditos, cancelaciones) → memoria estable 5G | `BusinessMemoryEngine` |
| `conversation-history` | Indexa eventos de conversación por `conversationId` | — (en memoria) |
| `notifications` | Envía notificaciones (hoy noop) de los eventos del catálogo por defecto | `NotificationChannel` inyectable |

## Reglas de uso

- **Un solo bus**: en producción todo circula por `getEventSystem()` (singleton).
- **No publicar desde listeners** salvo para eventos derivados de IA; el guard
  `maxReentrancy` corta bucles.
- **No inventar tipos**: usar siempre `EVENT_META`; si falta un evento, agregarlo
  al catálogo con su categoría antes de usarlo.
- **Dedupe** para publicaciones idempotentes (webhooks/colas): definir
  `dedupeKey` y se descartan duplicados dentro del TTL (default 5s).
- **Aislamiento**: eventos sin `tenantId` se cortan en el middleware de
  tenant-isolation (default).

## Cómo configurar el sistema en producción

```ts
import { configureEventSystem } from "@/lib/events"
import { PrismaEventHistoryStore } from "@/lib/events"
import { createBusinessMemoryEngine } from "@/lib/business-memory"

configureEventSystem({
  history: new PrismaEventHistoryStore(),      // auditoría persistente
  memory: createBusinessMemoryEngine(),        // memoria estable 5G
  refreshMonitor: async ({ tenantId }) => { /* refrescar BI 4B */ },
  generateRecommendations: async ({ tenantId }) => { /* motor 4D */ },
  notificationChannel: { send: (n) => { /* WhatsApp/Email/Push */ } },
})
```
