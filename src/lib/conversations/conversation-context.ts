/**
 * Context Manager — Motor de contexto conversacional (FASE 5C).
 *
 * Funciones PURAS y deterministas (sin I/O) que mantienen el estado estructurado
 * de una conversación: intención actual, entidad activa, parámetros conocidos y
 * pendientes, cambio de tema y ciclo de vida del contexto.
 *
 * Referencias contextuales soportadas: "ese/esa/eso", "el anterior", "el mismo",
 * "cámbialo", "ponle", "agrégale", "elimínalo", "ahora", "también", "ordénalos",
 * "solo las de ayer", "la descripción es ...".
 *
 * Regla de capas: este módulo no persiste nada; `conversation-manager.ts` decide
 * cuándo guardar y `conversation-storage.ts` sabe cómo.
 */
import type {
  ActiveEntity,
  ContextLifecycleOptions,
  ConversationContextState,
  ConversationDomain,
  TurnOutcome,
} from "./conversation-types"

/** Ciclo de vida por defecto del contexto (configurable). */
export const DEFAULT_CONTEXT_LIFECYCLE: ContextLifecycleOptions = {
  inactivityMs: 30 * 60 * 1000,
  maxKeyFacts: 12,
  maxOutcomes: 8,
  maxTopics: 10,
}

/** Resultado de resolver las referencias de un mensaje contra el contexto previo. */
export interface ReferenceResolution {
  /** Mensaje con las referencias ya expandidas (o el original si no había). */
  resolvedMessage: string
  /** true si el mensaje referenciaba el contexto previo. */
  referenceResolved: boolean
  /** Entidad reemplazada por una nueva ("cámbialo por Y"). */
  replacedEntity?: ActiveEntity | null
  /** Clave de un parámetro pendiente completado ("la descripción es X"). */
  completedParamKey?: string
  /** Valor con el que se completó el parámetro pendiente. */
  filledValue?: string
  /** Parámetros de alcance añadidos (fecha, orden, cantidad, ...). */
  scopeParams: Record<string, string>
}

const DEMONSTRATIVE_RE =
  /\b(ese|esa|esos|esas|eso|este|esta|estos|estas|esto|el anterior|la anterior|el mismo|la misma|el otro|la otra)\b/i

const ACTION_TOKEN_RE =
  /\b(cámbialo|cámbiala|cambialo|cambiala|ponle|ponme|agrégale|agregale|agréga|agrega|añádele|anadele|aumenta|reduce|elimínalo|eliminalo|elimínala|eliminala|bórralo|borralo|aplica|guarda|registra)\b/i

const NARROW_RE =
  /(solo las de ayer|solamente las de ayer|solo las|solamente las|solo los|solamente los|de ayer|de hoy|de esta semana|de este mes|la semana pasada|el mes pasado|últimos días|ultimos dias)/i

const COMPLETION_RE = /(?:la\s+)?(?:descripcion|descripción|detalle)\s+(?:es|sea|de)\s+(.+)/i

const REPLACE_RE = /\b(cámbialo|cámbiala|cambialo|cambiala)\s+(?:por|a)\s+(.+)/i

const ORDER_SORT_RE = /\b(?:ordena\w*|ordenar\w*|ordénalos|ordénalas)\b/i
const BY_CLAUSE_RE = /\bpor\s+([a-záéíóúñü]{2,20})/i

const FECHA_RE = /(ayer|hoy|esta semana|este mes|la semana pasada|el mes pasado)/i

/** Normaliza un número "12,5" → "12.5". */
function normalizeNumber(raw: string): string {
  return raw.trim().replace(",", ".")
}

/** Detección del dominio de negocio a partir del mensaje. */
export function detectDomain(message: string): ConversationDomain {
  const m = message.toLowerCase()
  // Dominios operativos con palabras fuertes primero: "gasto", "pedido", "cita"
  // ganan a "categoría"/"precio" (que también aparecen en inventario).
  if (/(gasto|gastos|egreso|egresos|presupuesto)/.test(m)) return "gastos"
  if (/(pedido|pedidos|orden|ordenes|órdenes|envio|envío|entregad)/.test(m)) return "pedidos"
  if (/(cita|citas|agenda|agendar|horario|reserv)/.test(m)) return "agenda"
  if (/(cliente|clientes|cartera|deuda|saldo)/.test(m)) return "clientes"
  if (/(venta|ventas|vend|ganancia|ingreso|ingresos|factura|punto de venta|transaccion|transacción)/.test(m)) return "ventas"
  if (/(producto|productos|stock|inventario|articulo|sku|categoria|categoría|existencias|precio|proveedor|agotad)/.test(m))
    return "inventario"
  return "general"
}

const ENTITY_LABEL: Record<ConversationDomain, { type: ActiveEntity["type"]; noun: string } | null> = {
  inventario: { type: "product", noun: "producto" },
  ventas: null,
  pedidos: { type: "order", noun: "pedido" },
  clientes: { type: "customer", noun: "cliente" },
  gastos: null,
  agenda: { type: "appointment", noun: "cita" },
  general: null,
}

/** Extrae la entidad activa de un mensaje (p.ej. producto, pedido, cliente). */
export function extractEntity(message: string, domain: ConversationDomain): ActiveEntity | null {
  const meta = ENTITY_LABEL[domain]
  if (!meta) return null
  const noun = meta.noun

  const labeled = message.match(
    new RegExp(`${noun}\\s+(?:llamado|llamada|nombrado|nombrada|denominado|denominada)\\s+["'\`]?([^"'.,;!¡¿?]{1,49})["'\`]?`, "i"),
  )
  if (labeled) {
    const name = cleanName(labeled[1])
    return name ? { type: meta.type, id: null, name } : null
  }

  const orderNumber = message.match(new RegExp(`(?:${noun}\\s*#?\\s*|orden\\s*#?\\s*|order\\s*#?\\s*)(\\d{1,10})`, "i"))
  if (orderNumber) {
    return { type: meta.type, id: orderNumber[1], name: orderNumber[1] }
  }

  const bare = message.match(new RegExp(`${noun}\\s+(?:el\\s+|la\\s+)?([^.,;!¡¿?]{1,49})$`, "i"))
  if (bare) {
    const name = cleanName(bare[1])
    if (name) return { type: meta.type, id: null, name }
  }

  return null
}

/** Limpia el nombre extraído de un producto/cliente (recorta calificadores). */
function cleanName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+(?:con|de|por|a|precio|en)\s+.*$/i, "")
    .replace(/[.,;!¡¿?]+$/g, "")
    .trim()
}

/** Extrae parámetros conocidos (cantidad, precio/monto, categoría, descripción, fecha, orden). */
export function extractParams(message: string, domain: ConversationDomain): Record<string, string> {
  const params: Record<string, string> = {}

  const qty = message.match(/(\d+(?:[.,]\d+)?)\s*(?:unidades?|uds?|unds?|unidad|item|items|piezas?)\b/i)
  if (qty) params.cantidad = normalizeNumber(qty[1])

  if (domain === "inventario" || domain === "gastos" || domain === "ventas") {
    const price =
      message.match(/(?:precio|precio\s+de)\s+(\d+(?:[.,]\d+)?)/i) ??
      message.match(/(\d+(?:[.,]\d+)?)\s*(?:dólares|dolares|usd|\$|bolívares|bolivares|bs\.?|bob)\b/i) ??
      message.match(/por\s+(\d+(?:[.,]\d+)?)\s*(?!fecha|día|dias|días)/i)
    if (price) {
      params[domain === "gastos" ? "monto" : "precio"] = normalizeNumber(price[1])
    }
  }

  const category = message.match(/(?:categoria|categoría)\s+(?:de\s+)?([^,.;!¡¿?]{1,30}?)(?:\s+por|\s+de|\s+con|\s*$)/i)
  if (category) params.categoria = category[1].trim()

  const description = message.match(/(?:descripcion|descripción|detalle)\s+(?:es|sea|de)\s+(.+)/i)
  if (description) params.descripcion = description[1].trim()

  const fecha = message.match(FECHA_RE)
  if (fecha) params.fecha = fecha[1].toLowerCase().replace(/\s+/g, "_")

  if (ORDER_SORT_RE.test(message)) {
    const by = message.match(BY_CLAUSE_RE)
    if (by) params.orden = by[1].trim()
  }

  return params
}

/** Frase que injerta la entidad activa en el mensaje resuelto. */
function entityPhrase(entity: ActiveEntity): string {
  switch (entity.type) {
    case "product":
      return `al producto "${entity.name}"`
    case "customer":
      return `al cliente "${entity.name}"`
    case "order":
      return `al pedido ${entity.name}`
    case "category":
      return `a la categoría "${entity.name}"`
    case "appointment":
      return `a la cita "${entity.name}"`
    default:
      return `al ${entity.name}`
  }
}

/** Mapea un dominio a una intención por defecto. */
function domainToIntent(domain: ConversationDomain): string {
  switch (domain) {
    case "inventario":
      return "inventario"
    case "ventas":
      return "ventas"
    case "pedidos":
      return "pedidos"
    case "clientes":
      return "clientes"
    case "gastos":
      return "gastos"
    case "agenda":
      return "agenda"
    default:
      return "conversacion"
  }
}

/** Etiqueta humana del tema de un dominio. */
function topicForDomain(domain: ConversationDomain): string {
  switch (domain) {
    case "inventario":
      return "Inventario"
    case "ventas":
      return "Ventas"
    case "pedidos":
      return "Pedidos"
    case "clientes":
      return "Clientes"
    case "gastos":
      return "Gastos"
    case "agenda":
      return "Agenda"
    default:
      return "General"
  }
}

/** Crea un contexto inicial vacío. */
export function createInitialContext(now = new Date().toISOString()): ConversationContextState {
  return {
    version: 1,
    intent: "conversacion",
    action: "",
    domain: "general",
    topic: "",
    activeEntity: null,
    knownParams: {},
    pendingParams: [],
    status: "active",
    turns: 0,
    updatedAt: now,
    lastTopicChangeAt: now,
  }
}

/** true si el contexto caducó por inactividad. */
export function isContextStale(context: ConversationContextState, options: ContextLifecycleOptions, now: string): boolean {
  const last = new Date(context.updatedAt).getTime()
  const current = new Date(now).getTime()
  return current - last > options.inactivityMs
}

/** Resuelve referencias contextuales del mensaje contra el contexto previo. */
export function resolveReferences(message: string, context: ConversationContextState): ReferenceResolution {
  const m = message.trim()
  const hasEntity = Boolean(context.activeEntity)
  const hasTopic = context.turns > 0 && context.domain !== "general"

  const completion = m.match(COMPLETION_RE)
  if (completion && context.pendingParams.some((p) => p.key === "descripcion")) {
    return {
      resolvedMessage: m,
      referenceResolved: true,
      completedParamKey: "descripcion",
      filledValue: completion[1].trim(),
      scopeParams: {},
    }
  }

  const replace = m.match(REPLACE_RE)
  if (replace && hasEntity) {
    const name = replace[2].trim().replace(/[.,;]+$/g, "")
    return {
      resolvedMessage: m,
      referenceResolved: true,
      replacedEntity: context.activeEntity ? { ...context.activeEntity, name } : null,
      scopeParams: { nombre: name },
    }
  }

  const hasActionToken = ACTION_TOKEN_RE.test(m)
  const hasDemonstrative = DEMONSTRATIVE_RE.test(m)
  const hasNarrow = NARROW_RE.test(m)

  if (hasEntity && (hasActionToken || hasDemonstrative) && context.activeEntity) {
    const prefix = entityPhrase(context.activeEntity)
    return {
      resolvedMessage: `${prefix} ${m}`,
      referenceResolved: true,
      scopeParams: {},
    }
  }

  const orderSort = ORDER_SORT_RE.test(m)
  const byClause = m.match(BY_CLAUSE_RE)
  if (hasTopic && orderSort && byClause) {
    return { resolvedMessage: m, referenceResolved: true, scopeParams: { orden: byClause[1].trim() } }
  }

  if (hasTopic && hasNarrow) {
    const scope: Record<string, string> = {}
    if (/de ayer|ayer/i.test(m)) scope.fecha = "ayer"
    else if (/de hoy|hoy/i.test(m)) scope.fecha = "hoy"
    else if (/de esta semana|esta semana/i.test(m)) scope.fecha = "esta_semana"
    else if (/de este mes|este mes/i.test(m)) scope.fecha = "este_mes"
    return { resolvedMessage: m, referenceResolved: true, scopeParams: scope }
  }

  if (hasTopic && /\b(ahora|también|tambien|eso mismo|el mismo|la misma)\b/i.test(m)) {
    return { resolvedMessage: m, referenceResolved: true, scopeParams: {} }
  }

  return { resolvedMessage: m, referenceResolved: false, scopeParams: {} }
}

/**
 * Detecta un cambio de tema: nuevo dominio sin referencias al contexto previo,
 * o contexto caducado por inactividad.
 */
export function detectTopicChange(
  context: ConversationContextState,
  message: string,
  referenceResolved: boolean,
  options: ContextLifecycleOptions,
  now: string,
): boolean {
  if (context.turns === 0) return false
  if (isContextStale(context, options, now)) return true
  if (referenceResolved) return false
  const domain = detectDomain(message)
  if (domain === "general") return false
  return domain !== context.domain
}

/** Parámetros pendientes según dominio e intención (determinista). */
function missingParams(domain: ConversationDomain, known: Record<string, string>, message: string): { key: string; label: string; prompt: string }[] {
  if (
    domain === "gastos" &&
    /\b(registra|registrar|agrega|crea|anota|crear|guarda)\b/i.test(message) &&
    !known.descripcion &&
    !/descripcion|descripción|detalle/i.test(message)
  ) {
    return [{ key: "descripcion", label: "descripción", prompt: "¿Cuál es la descripción del gasto?" }]
  }
  return []
}

/**
 * Aplica el resultado de un turno completo al contexto.
 * `base` ya viene con el cambio de tema/inactividad aplicado por el manager.
 */
export function applyTurnToContext(
  base: ConversationContextState,
  resolution: ReferenceResolution,
  outcome: TurnOutcome,
  now: string,
): ConversationContextState {
  const message = outcome.userMessage
  const next: ConversationContextState = {
    ...base,
    turns: base.turns + 1,
    updatedAt: now,
  }

  const detected = detectDomain(message)
  const domain = resolution.referenceResolved ? base.domain : detected === "general" ? base.domain : detected
  next.domain = domain
  next.intent = outcome.intent ?? domainToIntent(domain)

  if (!next.topic || next.topic === "General") {
    next.topic = topicForDomain(domain)
  }

  if (resolution.replacedEntity) {
    next.activeEntity = resolution.replacedEntity
  } else if (!resolution.referenceResolved) {
    const explicit = extractEntity(message, domain)
    if (explicit) next.activeEntity = explicit
  }

  const extracted = extractParams(message, domain)
  const merged: Record<string, string> = {
    ...next.knownParams,
    ...extracted,
    ...resolution.scopeParams,
  }
  if (resolution.filledValue) merged.descripcion = resolution.filledValue
  next.knownParams = merged

  if (resolution.completedParamKey) {
    next.pendingParams = next.pendingParams.filter((p) => p.key !== resolution.completedParamKey)
  } else {
    next.pendingParams = missingParams(domain, next.knownParams, message)
  }

  const actionExecuted = outcome.confirmed === true || outcome.toolNames.length > 0
  if (actionExecuted) {
    next.pendingParams = []
    next.status = "active"
  } else {
    next.status = next.pendingParams.length > 0 ? "awaiting_details" : "ready"
  }

  if (!next.activeEntity && Object.keys(next.knownParams).length === 0 && next.pendingParams.length === 0) {
    next.status = "active"
  }

  // FASE 5D: el engine de acciones conversacionales define el estado del contexto.
  if (outcome.actionId) next.actionId = outcome.actionId
  else if (next.status === "active") delete next.actionId
  if (outcome.knownParams) next.knownParams = outcome.knownParams
  if (outcome.contextStatus) next.status = outcome.contextStatus

  return next
}
