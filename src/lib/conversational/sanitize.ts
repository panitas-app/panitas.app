/**
 * Sanitización de respuestas (FASE 5B).
 *
 * Garantiza que el usuario NUNCA vea detalles internos del agente: llamadas a
 * herramientas, JSON, nombres de providers, errores técnicos ni prompts.
 *
 * Se aplica en dos capas:
 *   1. Servidor: `toClientChatView` al responder por la API.
 *   2. Cliente: `ChatMessage` antes de renderizar cualquier mensaje del asistente.
 */

const TOOL_DOMAIN_PREFIXES = new Set([
  "products",
  "product",
  "inventory",
  "customers",
  "customer",
  "orders",
  "order",
  "sales",
  "sale",
  "reports",
  "report",
  "analytics",
  "recommendations",
  "recommendation",
  "agenda",
  "delivery",
  "subscription",
])

const INTERNAL_WORDS_RE =
  /\b(openrouter|open[ -]?router|apikey|api[ -]?key|api[ -]?token|provider|toolcalls|prompt[ -]?tokens|completion[ -]?tokens|model[ _]?version|system[ _]?prompt)\b/gi

const TECHNICAL_ERROR_RE =
  /(tool[ _]?execution[ _]?failed|tool[ _]?error|unexpected[ _]?token|syntax[ _]?error|typeerror|referenceerror|rangeerror|cannot[ _]?read[ _]?propert|is[ _]?not[ _]?a[ _]?function|unhandled[ _]?promise|node_modules|\S+\.(js|ts|mjs|jsx|tsx):\d+)/gi

function stripFencedCode(text: string): string {
  return text.replace(/```[a-zA-Z0-9_-]*[\s\S]*?```/g, "").replace(/~~~[\s\S]*?~~~/g, "")
}

/** true si el segmento parece JSON interno (claves entre comillas o anidado). */
function looksLikeJson(segment: string): boolean {
  if (/"\s*[^"]{1,60}\s*"\s*:/.test(segment)) return true
  if (/\{\s*"/.test(segment)) return true
  return /\[.*\{/.test(segment)
}

/** Elimina bloques balanceados `{}` y `[]` que parezcan JSON interno. */
function stripJsonBlocks(text: string): string {
  let out = ""
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      out += ch
      continue
    }

    if (ch === '"') {
      inString = true
      out += ch
      continue
    }

    if (ch === "{" || ch === "[") {
      if (depth === 0) start = out.length
      depth++
      out += ch
      continue
    }

    if (ch === "}" || ch === "]") {
      if (depth === 0) {
        out += ch
        continue
      }
      depth--
      if (depth === 0 && start >= 0) {
        const segment = out.slice(start)
        out = out.slice(0, start)
        if (!looksLikeJson(segment)) out += segment + ch
        start = -1
      } else {
        out += ch
      }
      continue
    }

    out += ch
  }

  return out
}

/** Elimina identificadores con puntos de dominios internos (p.ej. `products.create`). */
function stripDottedIdentifiers(text: string): string {
  return text.replace(/\b[A-Za-z_][\w-]*(\.[A-Za-z_][\w-]*)+\b/g, (token) => {
    const first = token.split(".")[0]
    return TOOL_DOMAIN_PREFIXES.has(first) ? "" : token
  })
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ \(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim()
}

/**
 * Limpia una respuesta del asistente: elimina bloques JSON, tool names,
 * referencias a providers y errores técnicos, preservando el contenido natural.
 */
export function sanitizeAssistantReply(text: string): string {
  if (!text) return text
  let out = text
  out = stripFencedCode(out)
  out = stripJsonBlocks(out)
  out = stripDottedIdentifiers(out)
  out = out.replace(INTERNAL_WORDS_RE, " ")
  out = out.replace(TECHNICAL_ERROR_RE, " ")
  out = out.replace(/`([^`\n]+)`/g, "$1")
  out = normalizeSpacing(out)
  return out
}

/** true si el texto aún contiene marcadores internos (para validar en tests). */
export function hasLeaks(text: string): boolean {
  return (
    /```/.test(text) ||
    /\bopenrouter\b/i.test(text) ||
    /"[^\n"]{1,40}"\s*:/.test(text) ||
    /\b(toolcalls|stepid|confirmcode|prompt[ _-]?tokens|completion[ _-]?tokens|system[ _-]?prompt|tool[ _-]?execution[ _-]?failed)\b/i.test(text) ||
    /\b[a-z][\w-]*(\.[a-z][\w-]*)+\b/i.test(text)
  )
}
