/**
 * WhatsApp Cloud API (FASE 8A) — barrel público.
 *
 * Punto de entrada único del dominio WhatsApp: config de la app, conexiones
 * multi-tenant, fachada de comunicación por tienda e ingesta al inbox.
 */
export {
  readWhatsAppAppConfig,
  hasWhatsAppAppConfig,
  hasWhatsAppDefaultConnection,
  type WhatsAppAppConfig,
} from "./config"
export {
  ChannelConnectionService,
  WHATSAPP_CONNECTION_STATUSES,
  type WhatsAppConnectionInput,
  type WhatsAppConnectionDTO,
  type WhatsAppConnectionStatus,
} from "./connection-service"
export {
  getCommunicationService,
  invalidateCommunicationService,
  clearCommunicationServiceCache,
} from "./communication-service"
export { WhatsAppIngestionService, type WhatsAppIngestResult } from "./ingestion-service"
export { sendAgentMessage, type WhatsAppSendInput, type WhatsAppSendOutcome } from "./send-service"
export { extractPhoneNumberId, verifyWhatsAppWebhook, type WhatsAppWebhookVerifyResult } from "./webhook"
