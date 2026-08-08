/**
 * Instagram + Messenger (FASE 8B) — barrel público.
 *
 * Punto de entrada único del dominio Meta messaging: config de la app,
 * conexiones multi-tenant, fachada de comunicación por tienda+canal, ingesta
 * al inbox, envío saliente, utilidades de webhook y media.
 */
export {
  externalRefPrefix,
  defaultCustomerName,
  readMetaAppConfig,
  hasMetaAppConfig,
  type MetaAppConfig,
  type MetaChannel,
} from "./config"
export {
  MetaConnectionService,
  META_CONNECTION_CHANNELS,
  META_CONNECTION_STATUSES,
  type MetaConnectionDTO,
  type MetaConnectionInput,
  type MetaConnectionStatus,
} from "./connection-service"
export {
  getMetaCommunicationService,
  invalidateMetaCommunicationService,
  clearMetaCommunicationServiceCache,
} from "./communication-service"
export { MetaIngestionService, type MetaIngestResult } from "./ingestion-service"
export { sendMetaAgentMessage, type MetaSendInput, type MetaSendOutcome } from "./send-service"
export { extractMetaPageId, verifyMetaWebhook, type MetaWebhookVerifyResult } from "./webhook"
export {
  META_FALLBACK_SVG,
  fetchMetaMedia,
  resolveMetaAttachmentUrl,
} from "./media"
