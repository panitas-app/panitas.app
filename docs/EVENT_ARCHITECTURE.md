# EVENT ARCHITECTURE — Business Events Engine (FASE 5H)

## Visión

Panitas centraliza **toda** la comunicación entre módulos del negocio en un
único **Event Bus de dominio** (`src/lib/events/`). Ningún módulo de negocio
llama a otro directamente para enterarse de que algo pasó: **publica un evento**
y los consumidores interesados **se suscriben**. Esto desacopla ventas,
inventario, clientes, créditos, gastos, agenda, conversaciones e IA, y deja la
puerta abierta a WhatsApp, Instagram, Messenger, Email, Push, webhooks, APIs
públicas y colas (RabbitMQ/Kafka/BullMQ) **sin tocar la lógica de negocio**.

## Principios

1. **El bus NO ejecuta lógica de negocio.** Solo distribuye eventos.
2. **Toda lógica vive en listeners especializados**, cada uno en su módulo,
   sin depender entre sí.
3. **Multi-tenant:** cada evento lleva `tenantId` (frontera de aislamiento).
   El bus no filtra ni mezcla; el aislamiento de almacenamiento vive en los
   listeners.
4. **El evento es el contrato**: `type`, `data`, `tenantId`, `source`,
   `actorId`, `aggregateId`, `aggregateType`, `occurredAt`, `correlationId`.
5. **Nunca romper el flujo de negocio**: publicación y auditoría son
   best-effort (`fireDomainEvent`), errores aislados y reintentos por listener.
6. **Preparado para escalar**: el mismo `publish` puede enchufarse a una cola
   externa sin cambiar la API interna.

## Componentes

```
src/lib/events/
├── event-types.ts                Contratos (DomainEvent, Listener, Middleware…)
├── event-registry.ts             Catálogo EVENT_META (5 ventas, 5 productos, 4
│                                 clientes, 5 créditos, 3 gastos, 6 proveedores,
│                                 4 pedidos, 5 agenda, 4 conversaciones, 4 IA)
│                                 + LEGACY_EVENT_NAMES (puente)
├── event-bus.ts                  EventBus: publish/subscribe/*/middlewares/
│                                 onDispatched/stats/clear + anti-bucle
├── event-dispatcher.ts           EventListenerRegistry + dispatchEvent con
│                                 retry/backoff y aislamiento por listener
├── event-logger/                 ConsoleEventLogger / NoopEventLogger
├── event-middlewares/            correlation, tenant-isolation, dedupe, logger
├── event-history/                EventHistoryStore (InMemory | Prisma→AuditLog)
├── event-listeners/              audit-log, analytics, dashboard, monitor,
│                                 recommendations, business-memory,
│                                 conversation-history, notifications
├── event-system.ts               createEventSystem: compone bus + middlewares
│                                 + listeners + fireAndForget + close
├── legacy-bridge.ts              Republica el EventService antiguo por el bus
└── index.ts                      Barrel público (singleton + helpers)
```

## Flujo de una publicación

```
Servicio (order.service…)
   │  fireDomainEvent({ type, data, tenantId, actorId, source })
   ▼
EventBus.publish
   │  1. Guard anti-bucle (maxReentrancy, default 32)
   │  2. buildDomainEvent (id evt_*, occurredAt, aggregateType del catálogo)
   ▼
Middlewares (pipeline, un corte sin next() = rechazo)
   │  correlation → tenant-isolation → dedupe (opcional logger)
   ▼
dispatchEvent (EventDispatcher)
   │  listeners exactos + wildcard "*", prioridad (mayor primero),
   │  retry por listener (default 0, backoff retryDelayMs)
   ▼
onDispatched (auditoría/telemetría) → EventHistoryStore
   ▼
DispatchReport { event, startedAt, durationMs, results, ok, rejected }
```

## Eventos vs. estado

- Los eventos **describen hechos del pasado** (`sale.created`, `order.cancelled`).
- El estado vive en la BD (Prisma). El bus NO reemplaza la persistencia.
- Los listeners construyen **vistas derivadas en memoria** (analytics, feed,
  historial de conversaciones) o **disparan side effects** (refresh del monitor,
  recomendaciones, notificaciones, memoria estable 5G).

## Integraciones futuras

| Canal/Infra | Cómo se conecta |
|---|---|
| WhatsApp / Instagram / Messenger / Email / Push | Inyectar un `NotificationChannel` en `registerNotificationsListener` |
| Webhooks / API pública | Suscribirse al `EventBus` y reenviar eventos firmados |
| RabbitMQ / Kafka / BullMQ | Reemplazar/envolver `bus.publish` con un productor; listeners se vuelven consumidores |
| Reintentos e idempotencia | `dedupeKey` (middleware de dedupe) + `retries` por listener |

Ninguna de estas requiere modificar un módulo de negocio.

## Transición desde el EventService legacy

- `src/events/event.service.ts` sigue existiendo y los ~25 `eventService.emit`
  se mantienen intactos (los tests que lo mockean no cambian).
- En producción, `enableLegacyBridge()` republica esos eventos por el bus 5H
  (source `legacy:event.service`, metadata `{ legacy: true }`).
- Los servicios nuevos ya publican eventos 5H nativos con `aggregateId` y
  `actorId` (order, product, customer, expense, inventory, agenda,
  conversation, créditos/cuotas, engine de conversación y monitor 4B).

## Auditoría automática

El listener `audit-log` se registra vía `bus.onDispatched` y persiste el
reporte completo (evento, fecha, usuario, tenant, origen, resultado, duración,
estado, listeners) en el `EventHistoryStore`. En producción se inyecta
`PrismaEventHistoryStore`, que reutiliza la tabla `AuditLog` existente
(`action = "event.{tipo}"`, `storeId = tenantId`, detalle en metadata JSON)
**sin migraciones**. La escritura es best-effort: nunca rompe la publicación.
