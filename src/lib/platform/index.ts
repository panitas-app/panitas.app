/**
 * Platform (FASE 8D) — barrel público de la capa de extensiones/API.
 */
export { ApiError, apiError, httpStatusToApiErrorCode, type ApiErrorCode } from "./errors"
export {
  PUBLIC_API_PERMISSIONS,
  PUBLIC_API_RESOURCES,
  isPublicApiPermission,
  normalizePermissions,
  type PublicApiPermission,
  type PublicApiResource,
  type PublicApiScope,
} from "./permissions"

// API Keys
export { ApiKeyService, generateApiKeySecret, publicKeyMetadata, API_KEY_PREFIX } from "./api-key/service"
export type { ApiKeyRow, CreateApiKeyInput, CreatedApiKey } from "./api-key/service"

// Public API runtime
export { publicRoute, apiKeyService, type PublicApiHandler, type PublicRouteOptions } from "./public-api/route"
export type { PublicApiContext } from "./public-api/context"
export { authenticateApiRequest, extractBearerToken } from "./public-api/authenticate"
export { ok, created, noContent, fail, failFromError } from "./public-api/response"
export {
  paginate,
  parseLimit,
  parseCursor,
  parseSort,
  encodeCursor,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type PageResult,
} from "./public-api/pagination"
export { newRequestId, getOrCreateRequestId, REQUEST_ID_HEADER } from "./public-api/request-id"
export {
  readIdempotencyKey,
  findIdempotency,
  storeIdempotency,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAY_HEADER,
  IDEMPOTENCY_WINDOW_MS,
} from "./public-api/idempotency"
export { checkPublicApiRateLimit, PUBLIC_API_DEFAULTS } from "./public-api/rate-limit"

// Webhooks
export { WebhookService, generateWebhookSecret, parseEvents, DEAD_LETTER_FAILURE_THRESHOLD } from "./webhooks/service"
export type { CreateWebhookInput } from "./webhooks/service"
export { createWebhookDispatcher, type WebhookDispatcher, type WebhookDispatcherOptions } from "./webhooks/dispatcher"
export { webhookDispatcher } from "./webhooks/app"
export { signPayload, verifySignature, requireValidSignature, SIGNATURE_HEADER, EVENT_ID_HEADER, DELIVERY_ID_HEADER, TOLERANCE_MS } from "./webhooks/signature"
export {
  assertSafeEndpoint,
  isPrivateAddress,
  isPrivateIpv4,
  isPrivateIpv6,
  resolveAllAddresses,
  type AddressResolver,
} from "./webhooks/ssrf"
export {
  buildPayloadJson,
  deliverOnce,
  backoffForAttempt,
  isRetryable,
  MAX_DELIVERY_ATTEMPTS,
  DELIVERY_TIMEOUT_MS,
  type DeliveryAttempt,
} from "./webhooks/deliver"
export { SUGGESTED_WEBHOOK_EVENTS, type WebhookPayload, type WebhookSubscriptionRow, type WebhookDeliveryRow } from "./webhooks/types"

// Extensiones
export { ExtensionService, EXTENSION_TYPES, EXTENSION_STATUSES } from "./extensions/service"
export type { ExtensionRow, ExtensionStatus, ExtensionType, CreateExtensionInput } from "./extensions/service"

// Recursos v1 (handlers reutilizables por /api/v1/*)
export {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
} from "./resources/products"
export { listCustomers, getCustomer, createCustomer } from "./resources/customers"
export { listOrders, getOrder, createOrder } from "./resources/orders"
export { listInventory, getInventoryItem, adjustInventory } from "./resources/inventory"
export { listCredits, getCredit, registerPayment } from "./resources/credits"
export { listSuppliers, getSupplier, createSupplier, updateSupplier, recordPurchase, registerSupplierPayment } from "./resources/suppliers"
export { listConversations, getConversation } from "./resources/conversations"
export { listEventCatalog } from "./resources/events"
export { listAttention, getAttentionItem, acknowledgeAttention, resolveAttention, dismissAttention, snoozeAttention } from "./resources/attention"
