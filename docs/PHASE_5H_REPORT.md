# FASE 5H — Business Events Engine — Reporte

## Resumen ejecutivo

Se construyó la capa **`src/lib/events/`**: un **Event Bus de dominio** central
con publish/subscribe, middlewares, reintentos, prioridades, protección anti-
bucles, logging, dedupe opt-in, auditoría automática y listeners desacoplados
por módulo (analytics, dashboard, monitor, recomendaciones, memoria estable,
historial de conversaciones y notificaciones). Se integró la publicación de
eventos en **todos los módulos principales** y se dejó un **puente** que
republica por el bus los eventos del `EventService` legacy sin romper su
contrato (los tests que lo mockean no cambian).

El sistema está listo para los canales futuros (WhatsApp, Instagram, Messenger,
Email, Push, apps, webhooks, API pública) y para escalar a colas
(RabbitMQ/Kafka/BullMQ) **sin tocar la lógica de negocio**: solo se inyecta un
`NotificationChannel` o se envuelve `bus.publish`.

**Verificación:** `tsc --noEmit` OK · **780 tests verdes** (69 nuevos en
`tests/events/*`) · suite completa sin regresiones.

## Qué se implementó

### 1. Capa `src/lib/events/` (lógica pura)
- **`event-types.ts`**: `DomainEvent`, `EventInput`, `Listener`, `ListenerOptions`,
  `ListenerResult`, `DispatchReport`, `DispatchContext`, `EventMiddleware`,
  `EventStats`, `EventLogger`, `LogLevel`, `EventCategory`.
- **`event-registry.ts`**: `EVENT_META` con el catálogo completo de la fase
  (5 ventas, 5 productos, 4 clientes, 5 créditos, 3 gastos, 6 proveedores,
  4 pedidos, 5 agenda, 4 conversaciones, 4 IA) + los nombres legacy
  (`LEGACY_EVENT_NAMES`), `getEventMeta`, `isKnownEvent`, `EVENT_CATEGORIES`.
- **`event-bus.ts`**: `EventBus` con `publish`/`subscribe`/`subscribeAll("*")`/
  `unsubscribe`/`use`/`onDispatched`/`stats`/`clear`; pipeline de middlewares
  (cortar = no llamar `next()`); guard anti-bucles `maxReentrancy` (default 32)
  con `buildRejectedReport`; `buildDomainEvent` (id `evt_*`, `occurredAt`).
- **`event-dispatcher.ts`**: `EventListenerRegistry` (exactos + wildcard, orden
  por `priority` mayor primero) y `dispatchEvent` con **retry/backoff por
  listener** y **aislamiento de errores** (un listener que falla no detiene a
  los demás).
- **`event-middlewares/`**: `correlation` (asigna `correlationId`), `tenant-
  isolation` (corta eventos sin `tenantId`), `dedupe` (opt-in por `dedupeKey`,
  TTL default 5s, max 1000), `logger`.
- **`event-history/`**: `EventHistoryStore` con `InMemoryEventHistoryStore`
  (default, máx 10.000) y `PrismaEventHistoryStore` que **reutiliza `AuditLog`**
  sin migraciones (`action="event.{tipo}"`, detalle en metadata JSON,
  best-effort). `buildEventHistoryRecord(report)` → `ok|error|rejected`.
- **`event-listeners/`** (cada uno en su módulo, sin dependencias cruzadas):
  - `audit-log` — vía `bus.onDispatched`, persiste evento/fecha/usuario/tenant/
    origen/resultado/duración/estado.
  - `analytics` — contadores por tienda (ventas, ingresos, gastos, créditos,
    stock bajo, citas, mensajes) con snapshot aislado por tenant.
  - `dashboard` — feed de actividad reciente por tienda con resumen legible.
  - `business-monitor` — refresh del monitor 4B con throttle por tienda (5s).
  - `recommendations` — al `assistant.monitor.updated` genera recomendaciones
    4D y publica `assistant.recommendation.created`.
  - `business-memory` — observa `product.price.changed`, créditos, vencidos y
    cancelaciones para la memoria estable 5G.
  - `conversation-history` — indexa eventos de conversación por `conversationId`.
  - `notifications` — `NotificationChannel` inyectable (hoy noop), catálogo de
    mensajes por defecto.
- **`event-system.ts`**: `createEventSystem` compone bus + middlewares por
  defecto (correlation, tenant-isolation, dedupe, logger opcional) + listeners;
  `fireAndForget`; `close`. Seguro sin BD (history/feed/analytics en memoria).
- **`legacy-bridge.ts`**: `registerLegacyBridge(bus)` suscribe el
  `EventService` legacy y republica por el bus 5H (tenant desde
  `storeId`/`negocioId`, aggregate derivado del tipo, `source="legacy:event.service"`).
- **`index.ts`**: `getEventSystem` (singleton lazy), `configureEventSystem`,
  `resetEventSystemForTest`, `publishDomainEvent`, `fireDomainEvent`,
  `enableLegacyBridge` y re-exports completos.

### 2. Integración de publicación en servicios
- **`order.service.ts`**: `sale.created`, `order.created`; `sale.completed`/
  `order.completed` al entregar; `sale.cancelled`/`order.cancelled` al cancelar;
  `product.stock.changed` por ítem; `inventory.low_stock`; `credit.created` y
  `customer.credit.created` cuando hay crédito/cuotas.
- **`product.service.ts`**: `product.created/updated/deleted`, `product.price.changed`,
  `product.stock.changed` (edición).
- **`customer.service.ts`**: `customer.created/updated`.
- **`expense.service.ts`**: `expense.created/updated`.
- **`inventory.service.ts`**: `product.stock.changed` (movimientos) +
  `inventory.low_stock`.
- **`agenda.service.ts`**: `appointment.created/cancelled` (tenant = `negocioId`).
- **`conversation.service.ts`**: `conversation.started`, `conversation.message.created`,
  `conversation.deleted`.
- **`api/installments`**: `credit.payment.created` y `credit.completed`.
- **`api/cron/installment-reminders`**: `credit.overdue` por pedido con cuotas vencidas.
- **`lib/conversation/engine.ts`**: `conversation.intent.detected`,
  `assistant.context.updated` (por turno completado) y `assistant.memory.updated`
  (aprendizaje 5G).
- **`lib/agent/tools/domains/analytics.ts`**: `assistant.monitor.updated` cuando el
  monitor 4B genera su resumen.

## Tests (69 nuevos en `tests/events/`)

- **`event-bus.test.ts` (15)**: publicación, múltiples listeners, wildcard,
  prioridades, unsubscribe, aislamiento de errores, retry con éxito/agotado,
  middleware que corta, orden de pipeline, `onDispatched`, stats, anti-bucle,
  `clear`.
- **`middlewares.test.ts` (10)**: correlación (asigna/respeta), tenant-isolation
  (corta/sin tenant), dedupe (TTL/expiración/sin key), logger, loggers.
- **`event-history.test.ts` (12)**: store en memoria (filtros, paginación, límite),
  `buildEventHistoryRecord` (ok/error/rejected), `toAuditLogInput`, store Prisma
  con `@/lib/prisma` mockeado (persiste, no lanza si BD cae, recupera, cuenta).
- **`listeners.test.ts` (17)**: analytics, dashboard, conversation-history,
  notifications (catálogo/filtro/buildNotification), monitor (throttle por
  tenant, errores aislados), recommendations (genera y publica), business-memory
  (aprende por repetición con engine en memoria).
- **`event-system.test.ts` (11)**: integración completa (auditoría+analytics+feed),
  `enableListeners:false`, corte sin tenant, multi-tenant aislado, concurrencia
  (50 publishes), rendimiento (500 < 3s), `fireAndForget`, `close`, singleton
  (`publishDomainEvent`, `configureEventSystem`, `resetEventSystemForTest`).
- **`legacy-bridge.test.ts` (4)**: republicación con tenant/aggregate, `negocioId`,
  sin tenant no publica, `off()` desregistra.

## Notas de arquitectura

- **Reutiliza `AuditLog`** (schema `prisma/schema.prisma:183`) para la auditoría
  de eventos: cero migraciones, escritura best-effort.
- **No rompe el EventService legacy**: los ~25 `eventService.emit` y los tests
  que lo mockean (`tests/services/order.service.test.ts`, `tools/order-update-status`,
  `memory/manager`, `conversation/conversation.service`) quedan intactos; el
  puente se activa solo con `enableLegacyBridge()`.
- **Anti-bucles**: `maxReentrancy` (default 32) descarta eventos derivados
  excesivos; las recomendaciones publican `assistant.recommendation.created`
  desde un listener sin riesgo de loop.
- **Concurrencia**: el guard de reentrada limita publicaciones simultáneas en
  un mismo bus a 32 (configurable vía `new EventBus({ maxReentrancy })`); para
  ráfagas se puede escalar el valor o mover el bus detrás de una cola.

## Verificación

- `npm run typecheck` → OK
- `npx vitest run` → **780 tests passed** (104 archivos)
- `next build` → pendiente (paso final)
