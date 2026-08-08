/**
 * Communication Integration Layer (FASE 7C) — Providers (barrel).
 */
export { MockCommunicationProvider, type MockProviderOptions } from "./mock-provider"
export { parseWebhookPayload, parseWhatsAppCloudValue } from "./webhook-parser"
export {
  WhatsAppProvider,
  normalizeWhatsAppPhone,
  type WhatsAppProviderOptions,
  type WhatsAppConnectionConfig,
} from "./whatsapp-provider"
export {
  MetaMessagingProvider,
  type MetaMessagingConfig,
  type MetaMessagingProviderOptions,
} from "./meta-messaging-provider"
export { InstagramProvider, type InstagramConnectionConfig, type InstagramProviderOptions } from "./instagram-provider"
export { MessengerProvider, type MessengerConnectionConfig, type MessengerProviderOptions } from "./messenger-provider"
