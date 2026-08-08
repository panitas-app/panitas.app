/**
 * Humanización de errores (FASE 5B).
 *
 * El usuario jamás debe ver errores técnicos. Todo error (de red, de la API o
 * de las herramientas) se traduce a un mensaje natural en español, manteniendo
 * los mensajes que ya son amigables.
 */

const GENERIC = "No pude completar esa acción. ¿Quieres intentarlo nuevamente?"

const FRIENDLY_PREFIXES = [
  "no se pudo",
  "no pude",
  "ocurrió un error",
  "ocurrio un error",
  "el mensaje",
  "demasiadas",
  "no tienes",
  "tu plan",
  "acceso denegado",
  "no autorizado",
  "acción cancelada",
  "accion cancelada",
  "no se puede",
]

const GENERIC_PATTERNS =
  /(tool[ _]?execution[ _]?failed|tool[ _]?error|unexpected[ _]?token|syntax[ _]?error|typeerror|referenceerror|rangeerror|cannot[ _]?read[ _]?propert|is[ _]?not[ _]?a[ _]?function|unhandled[ _]?promise|\bjson\b.*(parse|invalid)|invalid.*json)/i

const NETWORK_PATTERNS = /(fetch failed|failed to fetch|econnrefused|enetunreach|enotfound|econnreset|getaddrinfo|network error|network request)/i

const TIMEOUT_PATTERNS = /(\btimed? ?out\b|timeout|request aborted|abort)/i

const RATE_LIMIT_PATTERNS = /(rate.?limit|demasiadas solicitudes|too many requests|\b429\b)/i

const PLAN_PATTERNS = /(no tienes|tu plan|plan actual|forbidden|not.?authorized|unauthorized|\b403\b)/i

/** Convierte cualquier error en un mensaje natural, nunca técnico. */
export function humanizeError(error: unknown): string {
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : ""
  const text = raw.trim()
  if (!text) return GENERIC

  const lower = text.toLowerCase()
  if (FRIENDLY_PREFIXES.some((prefix) => lower.startsWith(prefix))) return text

  if (GENERIC_PATTERNS.test(lower)) return GENERIC
  if (NETWORK_PATTERNS.test(lower)) return "No se pudo conectar. Revisa tu internet e intenta de nuevo."
  if (TIMEOUT_PATTERNS.test(lower)) return "Tardé demasiado en responder. ¿Quieres intentarlo nuevamente?"
  if (RATE_LIMIT_PATTERNS.test(lower)) return "He recibido demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo."
  if (PLAN_PATTERNS.test(lower)) return text.length < 200 ? text : "Tu plan actual no permite esa acción."

  // Mensajes cortos que ya se ven naturales: se conservan.
  if (text.length <= 160) return text

  return GENERIC
}
