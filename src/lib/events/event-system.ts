/**
 * Event System (FASE 5H).
 *
 * Compone un bus completo: middlewares por defecto (correlación, aislamiento
 * multi-tenant, dedupe) + listeners desacoplados. Es la fábrica que usan tanto
 * producción (con deps reales) como tests (con stores en memoria/noop).
 *
 * El sistema por defecto es seguro y no requiere BD: la auditoría y el historial
 * viven en memoria. En producción se puede inyectar el store Prisma, la memoria
 * del negocio 5G, el refresco del monitor 4B, las recomendaciones 4D y el canal
 * de notificaciones sin cambiar ningún módulo de negocio.
 */
import { EventBus } from "./event-bus"
import { NoopEventLogger } from "./event-logger"
import { correlationMiddleware, dedupeMiddleware, loggerMiddleware, tenantIsolationMiddleware } from "./event-middlewares"
import { InMemoryEventHistoryStore } from "./event-history"
import { registerEventListeners } from "./event-listeners"
import type {
  DispatchReport,
  EventInput,
  EventLogger,
  EventMiddleware,
  EventStats,
  Listener,
  ListenerOptions,
} from "./event-types"
import type { EventHistoryStore } from "./event-history"
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import type { NotificationChannel } from "./event-listeners/notifications.listener"

export interface EventSystemOptions {
  bus?: EventBus
  logger?: EventLogger
  history?: EventHistoryStore
  /** Memoria estable 5G (opcional). Si se pasa, aprende de los eventos. */
  memory?: BusinessMemoryEngine
  refreshMonitor?: (input: { tenantId: string; eventType: string; occurredAt: string }) => void | Promise<void>
  /** Invalida la caché de inteligencia financiera 6D cuando llegan eventos. */
  invalidateFinancial?: (storeId: string) => void | Promise<void>
  generateRecommendations?: (input: { tenantId: string; actorId?: string; correlationId?: string }) => Promise<unknown[]>
  notificationChannel?: NotificationChannel
  enableListeners?: boolean
  middlewares?: EventMiddleware[]
  dedupeTtlMs?: number
}

export interface EventSystem {
  bus: EventBus
  publish(input: EventInput): Promise<DispatchReport>
  fireAndForget(input: EventInput): void
  subscribe(eventType: string, listener: Listener, options?: ListenerOptions): () => void
  stats(): EventStats
  history: EventHistoryStore
  analytics: ReturnType<typeof registerEventListeners>["analytics"]
  dashboard: ReturnType<typeof registerEventListeners>["dashboard"]
  conversationHistory: ReturnType<typeof registerEventListeners>["conversationHistory"]
  audit: ReturnType<typeof registerEventListeners>["audit"]
  close(): void
}

export function createEventSystem(options: EventSystemOptions = {}): EventSystem {
  const bus = options.bus ?? new EventBus({ logger: options.logger ?? new NoopEventLogger() })
  const history = options.history ?? new InMemoryEventHistoryStore()

  bus.use(correlationMiddleware())
  bus.use(tenantIsolationMiddleware())
  bus.use(dedupeMiddleware({ ttlMs: options.dedupeTtlMs ?? 5_000 }))
  if (options.logger) {
    bus.use(loggerMiddleware(options.logger))
  }
  for (const middleware of options.middlewares ?? []) {
    bus.use(middleware)
  }

  let bundle: ReturnType<typeof registerEventListeners> | null = null
  if (options.enableListeners !== false) {
    bundle = registerEventListeners(bus, {
      history,
      memory: options.memory,
      refreshMonitor: options.refreshMonitor,
      invalidateFinancial: options.invalidateFinancial,
      generateRecommendations: options.generateRecommendations,
      notificationChannel: options.notificationChannel,
    })
  }

  return {
    bus,
    publish: (input) => bus.publish(input),
    fireAndForget: (input) => {
      void bus.publish(input).catch((error: unknown) =>
        console.error("[events] publicación falló:", String(error)),
      )
    },
    subscribe: (eventType, listener, listenerOptions) => bus.subscribe(eventType, listener, listenerOptions),
    stats: () => bus.stats(),
    history,
    analytics: bundle?.analytics as EventSystem["analytics"],
    dashboard: bundle?.dashboard as EventSystem["dashboard"],
    conversationHistory: bundle?.conversationHistory as EventSystem["conversationHistory"],
    audit: bundle?.audit as EventSystem["audit"],
    close: () => {
      bundle?.unregister()
      bus.clear()
    },
  }
}
