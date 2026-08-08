/**
 * Event Listeners (FASE 5H).
 *
 * Registra todos los listeners del sistema sobre un bus. Cada listener vive en
 * su propio módulo y NO depende de los demás. El orden de registro aquí es lo
 * único que centraliza; la lógica queda desacoplada.
 */
import type { EventBus } from "../event-bus"
import type { EventHistoryStore } from "../event-history"
import { createAuditLogListener } from "./audit-log.listener"
import { createEventAnalytics } from "./analytics.listener"
import { createEventFeed } from "./dashboard.listener"
import { registerBusinessMonitorListener } from "./business-monitor.listener"
import { registerRecommendationsListener } from "./recommendations.listener"
import { registerBusinessMemoryListener } from "./business-memory.listener"
import { createConversationEventHistory } from "./conversation-history.listener"
import { registerNotificationsListener } from "./notifications.listener"
import { registerFinancialListener } from "./financial.listener"
import { registerInboxListener } from "./inbox.listener"
import { registerCopilotListener, type CopilotEventRecord } from "./copilot.listener"
import { registerCommunicationListener, type CommunicationEventRecord } from "./communication.listener"
import { registerKnowledgeListener, type KnowledgeEventRecord, type KnowledgeListener, type KnowledgeListenerOptions, type KnowledgeListenerState } from "./knowledge.listener"
import type { BusinessMemoryEngine } from "@/lib/business-memory"

export {
  createAuditLogListener,
  type AuditLogListenerOptions,
} from "./audit-log.listener"
export {
  createEventAnalytics,
  type EventAnalytics,
  type EventAnalyticsSnapshot,
} from "./analytics.listener"
export {
  createEventFeed,
  type DashboardFeedItem,
  type EventFeed,
} from "./dashboard.listener"
export {
  createConversationEventHistory,
  type ConversationEventHistory,
  type ConversationEventRecord,
} from "./conversation-history.listener"
export {
  registerBusinessMemoryListener,
} from "./business-memory.listener"
export {
  registerBusinessMonitorListener,
  type MonitorRefreshInput,
  type BusinessMonitorListenerOptions,
} from "./business-monitor.listener"
export {
  registerFinancialListener,
  FINANCIAL_TRIGGER_EVENTS,
  type FinancialListenerOptions,
} from "./financial.listener"
export {
  registerRecommendationsListener,
  type RecommendationGenerationInput,
  type RecommendationsListenerOptions,
} from "./recommendations.listener"
export {
  registerNotificationsListener,
  NoopNotificationChannel,
  buildNotification,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationsListenerOptions,
} from "./notifications.listener"
export {
  registerInboxListener,
  INBOX_EVENTS,
  type InboxNotifyInput,
  type InboxListenerOptions,
} from "./inbox.listener"
export {
  registerCopilotListener,
  type CopilotEventRecord,
  type CopilotListener,
  type CopilotListenerOptions,
} from "./copilot.listener"
export {
  registerCommunicationListener,
  type CommunicationEventRecord,
  type CommunicationListener,
  type CommunicationListenerOptions,
  type CommunicationListenerState,
} from "./communication.listener"
export {
  registerKnowledgeListener,
  type KnowledgeEventRecord,
  type KnowledgeListener,
  type KnowledgeListenerOptions,
  type KnowledgeListenerState,
} from "./knowledge.listener"

export interface EventListenersOptions {
  history?: EventHistoryStore
  memory?: BusinessMemoryEngine
  refreshMonitor?: (input: { tenantId: string; eventType: string; occurredAt: string }) => void | Promise<void>
  invalidateFinancial?: (storeId: string) => void | Promise<void>
  generateRecommendations?: (input: { tenantId: string; actorId?: string; correlationId?: string }) => Promise<unknown[]>
  notificationChannel?: import("./notifications.listener").NotificationChannel
  notifyInbox?: (input: import("./inbox.listener").InboxNotifyInput) => void | Promise<void>
  onCopilotEvent?: (record: CopilotEventRecord) => void
  onCommunicationEvent?: (record: CommunicationEventRecord) => void
  onKnowledgeEvent?: (record: KnowledgeEventRecord) => void
}

export interface EventListenersBundle {
  analytics: ReturnType<typeof createEventAnalytics>
  dashboard: ReturnType<typeof createEventFeed>
  conversationHistory: ReturnType<typeof createConversationEventHistory>
  /** Listener de auditoría (su store es `history`). */
  audit: ReturnType<typeof createAuditLogListener>
  unregister: () => void
}

export function registerEventListeners(bus: EventBus, options: EventListenersOptions = {}): EventListenersBundle {
  const analytics = createEventAnalytics()
  const dashboard = createEventFeed()
  const conversationHistory = createConversationEventHistory()
  const audit = createAuditLogListener({ store: options.history })

  const unregister: Array<() => void> = [
    audit.register(bus),
    analytics.register(bus),
    dashboard.register(bus),
    conversationHistory.register(bus),
    registerBusinessMonitorListener(bus, {
      refresh: options.refreshMonitor,
    }),
    registerRecommendationsListener(bus, {
      generate: options.generateRecommendations,
    }),
    registerBusinessMemoryListener(bus, {
      memory: options.memory,
    }),
    registerFinancialListener(bus, {
      invalidate: options.invalidateFinancial,
    }),
    registerInboxListener(bus, {
      notify: options.notifyInbox,
    }),
    registerNotificationsListener(bus, {
      channel: options.notificationChannel,
    }),
    registerCopilotListener(bus, {
      onEvent: options.onCopilotEvent,
    }).register(),
    registerCommunicationListener(bus, {
      onEvent: options.onCommunicationEvent,
    }).register(),
    registerKnowledgeListener(bus, {
      onEvent: options.onKnowledgeEvent,
    }).register(),
  ]

  return {
    analytics,
    dashboard,
    conversationHistory,
    audit,
    unregister: () => {
      for (const off of unregister) off()
    },
  }
}
