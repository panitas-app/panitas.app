/**
 * Communication Integration Layer (FASE 7C) — Middlewares (barrel).
 */
export {
  composeSendMiddlewares,
  type SendMiddleware,
} from "./middleware-types"
export {
  validateOutboundMiddleware,
  MAX_TEXT_LENGTH,
} from "./validation"
export {
  normalizeOutboundMiddleware,
  normalizeInboundEvent,
} from "./normalization"
export {
  retryMiddleware,
  retryExhaustedError,
  isProviderOffline,
  type RetryMiddlewareOptions,
} from "./retry"
export {
  rateLimitMiddleware,
  type RateLimitMiddlewareOptions,
} from "./rate-limit"
export {
  defaultLog,
  loggingMiddleware,
  noopLog,
  type LogEntry,
  type LogFn,
} from "./logging"
