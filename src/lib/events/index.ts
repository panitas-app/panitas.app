/**
 * Business Events Engine (FASE 5H) — barrel público.
 *
 * Punto de entrada único. Expone:
 *
 *   - el sistema singleton (`getEventSystem` / `configureEventSystem`),
 *   - helpers cómodos para servicios (`publishDomainEvent`, `fireDomainEvent`),
 *   - el puente legacy (`enableLegacyBridge`),
 *   - todas las fábricas y tipos del bus.
 */
import type { DispatchReport, EventInput } from "./event-types"
import { createEventSystem, type EventSystem, type EventSystemOptions } from "./event-system"
import { registerLegacyBridge } from "./legacy-bridge"
import { webhookDispatcher } from "@/lib/platform/webhooks/app"

let system: EventSystem | null = null
let legacyBridgeOff: (() => void) | null = null
let webhookDispatcherOff: (() => void) | null = null

/** Adjunta los listeners de plataforma (webhooks salientes) al bus del sistema. */
function attachPlatformListeners(eventSystem: EventSystem): void {
  webhookDispatcherOff?.()
  webhookDispatcherOff = webhookDispatcher.register(eventSystem.bus)
}

/** Devuelve el sistema global (lo crea con opciones seguras la primera vez). */
export function getEventSystem(options?: EventSystemOptions): EventSystem {
  if (!system) {
    system = createEventSystem(options ?? {})
    attachPlatformListeners(system)
  }
  return system
}

/** Reconfigura el sistema global (cierra el anterior). Útil en producción. */
export function configureEventSystem(options: EventSystemOptions = {}): EventSystem {
  system?.close()
  system = createEventSystem(options)
  attachPlatformListeners(system)
  return system
}

/** Para tests: reinicia el singleton sin fuga de listeners. */
export function resetEventSystemForTest(): void {
  legacyBridgeOff?.()
  legacyBridgeOff = null
  webhookDispatcherOff?.()
  webhookDispatcherOff = null
  system?.close()
  system = null
}

/** Publica un evento en el sistema global (await completo). */
export function publishDomainEvent(input: EventInput): Promise<DispatchReport> {
  return getEventSystem().publish(input)
}

/** Publica en segundo plano (fire-and-forget). Ideal dentro de servicios. */
export function fireDomainEvent(input: EventInput): void {
  getEventSystem().fireAndForget(input)
}

/** Activa el puente legacy (eventService → bus 5H). Idempotente. */
export function enableLegacyBridge(): () => void {
  const off = registerLegacyBridge(getEventSystem().bus)
  legacyBridgeOff?.()
  legacyBridgeOff = off
  return off
}

export { EventBus, type EventBusOptions } from "./event-bus"
export {
  EventListenerRegistry,
  dispatchEvent,
  messageOf,
  type DispatchOptions,
  type DispatchOutcome,
  type RegisteredListener,
} from "./event-dispatcher"
export {
  EVENT_CATEGORIES,
  EVENT_META,
  LEGACY_EVENT_NAMES,
  getEventMeta,
  isKnownEvent,
  type BusinessEventName,
} from "./event-registry"
export type {
  DispatchContext,
  DispatchReport,
  DomainEvent,
  EventCategory,
  EventInput,
  EventLogEntry,
  EventLogger,
  EventMeta,
  EventMiddleware,
  EventStats,
  Listener,
  ListenerOptions,
  ListenerResult,
  LogLevel,
} from "./event-types"
export {
  NoopEventLogger,
  ConsoleEventLogger,
  createEventLogger,
} from "./event-logger"
export {
  correlationMiddleware,
  dedupeMiddleware,
  loggerMiddleware,
  tenantIsolationMiddleware,
  type DedupeMiddlewareOptions,
} from "./event-middlewares"
export {
  buildEventHistoryRecord,
  InMemoryEventHistoryStore,
  type EventHistoryCountOptions,
  type EventHistoryListOptions,
  type EventHistoryRecord,
  type EventHistoryStore,
} from "./event-history"
export { PrismaEventHistoryStore, toAuditLogInput } from "./event-history/prisma"
export {
  createAuditLogListener,
  createEventAnalytics,
  createEventFeed,
  createConversationEventHistory,
  registerBusinessMemoryListener,
  registerBusinessMonitorListener,
  registerFinancialListener,
  registerInboxListener,
  registerCopilotListener,
  registerCommunicationListener,
  registerKnowledgeListener,
  registerNotificationsListener,
  registerRecommendationsListener,
  registerAttentionListener,
  NoopNotificationChannel,
  buildNotification,
  type AttentionListenerOptions,
  type ConversationEventRecord,
  type CopilotEventRecord,
  type CommunicationEventRecord,
  type DashboardFeedItem,
  type EventAnalytics,
  type EventAnalyticsSnapshot,
  type FinancialListenerOptions,
  type InboxListenerOptions,
  type InboxNotifyInput,
  type KnowledgeEventRecord,
  type KnowledgeListener,
  type KnowledgeListenerOptions,
  type KnowledgeListenerState,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationsListenerOptions,
} from "./event-listeners"
export { createEventSystem, type EventSystem, type EventSystemOptions } from "./event-system"
export { registerLegacyBridge } from "./legacy-bridge"
