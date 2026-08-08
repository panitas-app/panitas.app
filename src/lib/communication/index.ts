/**
 * Communication Integration Layer (FASE 7C) — barrel público.
 *
 * Punto de entrada único de la capa de comunicación. Exports de proveedores,
 * middlewares, seguridad, salud, registro, fábrica, gestor y servicio.
 */
export {
  COMMUNICATION_EVENTS,
  COMMUNICATION_EVENT_DOMAIN,
  PROVIDER_CHANNEL_META,
  PROVIDER_CHANNEL_TYPES,
  PROVIDER_MESSAGE_STATUSES,
  PROVIDER_SENDERS,
  PROVIDER_STATUSES,
  PROVIDER_STATUS_UPDATE_TYPES,
  type CommunicationEventName,
  type CommunicationEventRecord,
  type ProviderAttachment,
  type ProviderChannelType,
  type ProviderConnectionResult,
  type ProviderHealth,
  type ProviderInboundEvent,
  type ProviderMessage,
  type ProviderMessageStatus,
  type ProviderMeta,
  type ProviderMetrics,
  type ProviderOutboundInput,
  type ProviderRuntimeView,
  type ProviderSender,
  type ProviderSendResult,
  type ProviderStatus,
  type ProviderStatusUpdate,
  type ProviderStatusUpdateType,
  type ProviderWebhookPayload,
} from "./provider-types"
export type { CommunicationProvider, ProviderSendOptions } from "./interfaces/communication-provider"
export {
  composeSendMiddlewares,
  loggingMiddleware,
  MAX_TEXT_LENGTH,
  noopLog,
  normalizeInboundEvent,
  normalizeOutboundMiddleware,
  rateLimitMiddleware,
  retryMiddleware,
  validateOutboundMiddleware,
  type LogEntry,
  type LogFn,
  type RateLimitMiddlewareOptions,
  type RetryMiddlewareOptions,
  type SendMiddleware,
} from "./middlewares"
export {
  createSignature,
  generateSecret,
  requireWebhookSecret,
  rotateCredentials,
  safeEqualHex,
  sanitizeProviderConfig,
  verifyBearerToken,
  verifyWebhookSignature,
  type RotatedCredentials,
} from "./security"
export { MockCommunicationProvider, type MockProviderOptions } from "./providers"
export {
  WhatsAppProvider,
  normalizeWhatsAppPhone,
  type WhatsAppProviderOptions,
  type WhatsAppConnectionConfig,
} from "./providers"
export {
  InstagramProvider,
  type InstagramConnectionConfig,
  type InstagramProviderOptions,
} from "./providers"
export {
  MessengerProvider,
  type MessengerConnectionConfig,
  type MessengerProviderOptions,
} from "./providers"
export {
  MetaMessagingProvider,
  type MetaMessagingConfig,
  type MetaMessagingProviderOptions,
} from "./providers"
export { parseWebhookPayload } from "./providers/webhook-parser"
export { ProviderRegistry } from "./provider-registry"
export { MockProviderFactory, type ProviderFactoryOptions } from "./provider-factory"
export { ProviderHealthMonitor, type ProviderHealthMonitorOptions } from "./provider-health"
export { ProviderManager, type ProviderManagerOptions } from "./provider-manager"
export { CommunicationService, type CommunicationServiceOptions } from "./communication-service"
