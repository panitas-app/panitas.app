/**
 * Params del Conversational Actions Engine (FASE 5D).
 *
 * Funciones PURAS y deterministas para extraer parámetros de un mensaje,
 * detectar cuáles faltan, generar las preguntas naturales y validar valores.
 * No hace I/O: la persistencia del estado la decide el engine (contexto 5C).
 */
import type { ActionDomain, ActionParam, ConversationalAction, KnownParams } from "./types"

/** Marcadores para extraer la referencia a un producto de un mensaje. */
const PRODUCT_MARKERS = [
  "el producto llamado",
  "el producto",
  "cambiar el precio de",
  "cambiar precio de",
  "el precio de",
  "precio de",
  "el precio a",
  "precio a",
  "ponerle precio a",
  "poner precio a",
  "el stock de",
  "stock de",
  "la cantidad de",
  "aumentar stock de",
  "subir stock de",
  "bajar stock de",
  "reducir stock de",
  "quitar stock de",
  "ajustar stock de",
  "reponer el",
  "reponer",
  "editar el",
  "editar",
  "edita el",
  "modificar el",
  "modificar",
  "actualizar el",
  "actualizar",
  "eliminar el",
  "eliminar",
  "elimina el",
  "elimina",
  "borrar el",
  "borrar",
  "borra el",
  "borra",
  "quitar el",
  "quitar",
  "buscar el",
  "buscar",
  "busca el",
  "busca",
  "busco el",
  "busco",
]

/** Marcadores para extraer la referencia a un gasto. */
const EXPENSE_MARKERS = ["el gasto", "gasto", "corregir el", "corregir", "corrige el", "corrige", "editar el", "editar", "modificar el", "modificar", "cambiar el", "cambiar", "actualizar el", "actualizar"]

/** Marcadores para extraer la referencia a un pedido. */
const ORDER_MARKERS = ["el pedido", "pedido", "la orden", "orden", "detalle del", "detalle de la", "cancelar el", "cancelar", "ver el", "ver"]

/** Marcadores para extraer el término de búsqueda. */
const SEARCH_MARKERS = [
  "buscar el",
  "buscar",
  "busca el",
  "busca",
  "busco el",
  "busco",
  "dame el",
  "dame",
  "muestrame el",
  "muestrame los",
  "muestrame",
  "muestra los productos",
  "muestra productos",
  "muestra los",
  "muestra el",
  "muestra",
  "ensename los",
  "ensename",
  "lista los",
  "lista",
  "listame los",
  "listame",
  "listar",
  "que productos",
  "que clientes",
  "ver los",
  "ver productos",
  "ver clientes",
]

const NUMBER = /\d+(?:[.,]\d+)?/

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeNumber(raw: string): string {
  return raw.trim().replace(",", ".")
}

const CURRENCY_RE = new RegExp(`(?:\\$|usd|bob|bs\\.?|d[oó]lares|bol[ií]vares)\\s*(${NUMBER.source})|(${NUMBER.source})\\s*(?:usd|bob|bs\\.?|d[oó]lares|bol[ií]vares)`, "i")
const DE_POR_AMOUNT_RE = new RegExp(`(?:de|por|en)\\s+(${NUMBER.source})`, "i")
const QUANTITY_RE = /(\d+(?:[.,]\d+)?)\s*(?:unidades?|uds?|unid\.?|piezas?|items?)?/i

const PAYMENT_METHODS: Record<string, string> = {
  efectivo: "cash",
  cash: "cash",
  pago: "pago_movil",
  movil: "pago_movil",
  transferencia: "bank_transfer",
  zelle: "bank_transfer",
  banco: "bank_transfer",
  tarjeta: "card",
  credito: "credit",
  cuotas: "credit",
  punto: "pos",
}

const PERIOD_WORDS: Record<string, string> = {
  hoy: "hoy",
  "hoy dia": "hoy",
  ayer: "ayer",
  "esta semana": "esta_semana",
  "la semana pasada": "semana_pasada",
  "de la semana": "esta_semana",
  "este mes": "este_mes",
  "del mes": "este_mes",
  "el mes pasado": "mes_pasado",
}

/** Palabras que no deben interpretarse como nombre de producto/cliente. */
const STOPWORDS = new Set([
  "y", "a", "al", "de", "del", "la", "las", "el", "los", "un", "una", "unos", "unas", "para", "con", "por",
  "en", "que", "cuanto", "cuantos", "me", "te", "se", "su", "mi", "venta", "ventas", "vendo", "vendi",
  "registra", "registrar", "registro", "crear", "crea", "agregar", "agrega", "añade", "anadir", "anota",
  "producto", "productos", "articulo", "articulos", "precio", "precios", "stock", "cantidad", "cliente",
  "clientes", "gasto", "gastos", "monto", "descripcion", "categoria", "fecha", "metodo", "de", "pago",
  "pagos", "efectivo", "tarjeta", "credito", "descuento", "proveedor", "proveedores", "pedido", "pedidos",
  "orden", "ordenes", "a", "el", "la", "los", "las", "compra", "compras", "abono", "abonos", "saldo",
  "pagar", "pagare", "deberia", "hoy", "ayer", "esta", "mes", "semana", "necesito", "quiero", "dame",
  "llamado", "llamada", "nombrado", "nombrada", "denominado", "llamar", "soy", "buscar", "busca",
  "telefono", "teléfono", "email", "correo", "direccion", "dirección", "con", "de",
])

/** Extrae el monto/precio de un mensaje (determinista). */
export function extractAmount(message: string): string | null {
  const currency = message.match(CURRENCY_RE)
  if (currency) return normalizeNumber(currency[1] ?? currency[2])

  const dePor = message.match(DE_POR_AMOUNT_RE)
  if (dePor) return normalizeNumber(dePor[1])

  const standalone = message.match(NUMBER)
  if (standalone) return normalizeNumber(standalone[0])
  return null
}

/** Extrae la cantidad con unidades. */
export function extractQuantity(message: string): string | null {
  const m = message.match(QUANTITY_RE)
  return m ? normalizeNumber(m[1]) : null
}

/** Extrae el nombre tras el marcador más a la derecha presente en el mensaje. */
export function extractAfter(message: string, markers: string[]): string | null {
  const lower = message.toLowerCase()
  let bestIndex = -1
  let bestMarker = ""
  for (const marker of markers) {
    const idx = lower.indexOf(marker)
    if (idx !== -1 && idx > bestIndex) {
      bestIndex = idx
      bestMarker = marker
    }
  }
  if (!bestMarker) return null
  const re = new RegExp(
    `${escapeRe(bestMarker)}\\s+(?:de\\s+)?["']?([a-záéíóúñü0-9][a-záéíóúñü0-9#\\- ]{0,39}?)["']?(?:\\s+(?:por|de|con|a|al|para|en)\\s+|$|,)`,
    "i"
  )
  const m = message.match(re)
  if (!m) return null
  return m[1].trim().replace(/[.,;!¡¿?]+$/g, "")
}

/** Extrae los items de una venta: array de {producto, cantidad}. */
export function extractSaleItems(message: string): Array<{ producto: string; cantidad: number }> {
  const items: Array<{ producto: string; cantidad: number }> = []

  // Patrón principal: "N unidades de X" | "N X" separado por "y" o ",".
  const chunkRe = /(\d{1,3})\s*(?:unidades?|uds?|unid\.?|x)?\s*(?:de|del|de la|de el)?\s*([a-záéíóúñü][a-záéíóúñü0-9 ]{1,40}?)(?=\s+(?:y|,|;|\.|por|a|con|al|el|la|para|pagado|en)(?:\s|$)|[,;.]|$)/gi
  let match: RegExpExecArray | null
  const seen = new Set<string>()
  while ((match = chunkRe.exec(message)) !== null) {
    const raw = match[2].trim().replace(/[.,;]+$/g, "").toLowerCase()
    const words = raw.split(/\s+/)
    const cleaned = words.filter((w) => !STOPWORDS.has(w)).join(" ")
    if (cleaned.length < 2 || seen.has(cleaned)) continue
    seen.add(cleaned)
    items.push({ producto: cleaned, cantidad: parseInt(match[1], 10) })
  }

  // Fallback: mención única de un producto sin cantidad (cantidad 1).
  if (items.length === 0) {
    const single = message.match(/(?:venta de|vendo|vendi|vender|una|un)\s+([a-záéíóúñü][a-záéíóúñü0-9 ]{1,40}?)(?=\s*(?:por|a|con|al|para|$)|$)/i)
    if (single) {
      const cleaned = single[1].trim().replace(/[.,;]+$/g, "").toLowerCase()
      const words = cleaned.split(/\s+/).filter((w) => !STOPWORDS.has(w))
      if (words.join(" ").length >= 2) items.push({ producto: words.join(" "), cantidad: 1 })
    }
  }

  return items
}

/** Extrae el método de pago mencionado. */
export function extractPaymentMethod(message: string): string | null {
  const m = message.toLowerCase()
  for (const [word, value] of Object.entries(PAYMENT_METHODS)) {
    if (new RegExp(`\\b${word}\\b`).test(m)) return value
  }
  return null
}

/** Extrae el período/fecha mencionado. */
export function extractPeriod(message: string): string | null {
  const m = message.toLowerCase()
  for (const [word, value] of Object.entries(PERIOD_WORDS)) {
    if (m.includes(word)) return value
  }
  const date = message.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/)
  if (date) return date[1]
  return null
}

/** Extrae un teléfono (admite espacios, guiones y prefijo internacional). */
export function extractPhone(message: string): string | null {
  const m = message.match(/(?:\+?\d[\d\s-]{6,17})/)
  if (!m) return null
  return m[0].replace(/[\s-]/g, "")
}

/** Extrae el descuento: "descuento de 10%" | "10% de descuento". */
export function extractDiscount(message: string): string | null {
  const m = message.match(/(\d+(?:[.,]\d+)?)\s*(%)?\s*(?:de\s+)?descuento|descuento\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(%)?/i)
  if (!m) return null
  const value = m[1] ?? m[3]
  const isPercent = m[2] === "%" || m[4] === "%"
  return isPercent ? `${normalizeNumber(value)}%` : normalizeNumber(value)
}

/** Extrae el plazo de crédito: "3 cuotas" | "a crédito" | "le fío". */
export function extractCredit(message: string): string | null {
  const m = message.toLowerCase()
  const cuotas = m.match(/(\d{1,3})\s*c(uotas)?/)
  if (/fiad|fiar|fio\b|a credito|credito|crediado/.test(m)) {
    return cuotas ? `cuotas_${cuotas[1]}_15d` : "fiado"
  }
  if (/\d+\s*d[ií]as|cuotas|plazos|al fiado|abono/.test(m)) {
    return cuotas ? `cuotas_${cuotas[1]}_15d` : "cuotas_3_15d"
  }
  return null
}

/** Extrae el término de una búsqueda ("busca cocacola" → "cocacola"). */
export function extractTerm(message: string): string | null {
  const m = message.match(new RegExp(`(?:${SEARCH_MARKERS.join("|")})\\s+["']?([a-záéíóúñü][a-záéíóúñü0-9 ]{1,39}?)["']?(?:\\s+por|\\s+de|\\s+con|\\s+para|\\s+el|\\s+la|\\s+que|$|,)`, "i"))
  if (!m) return null
  const raw = m[1].trim().replace(/[.,;!¡¿?]+$/g, "")
  const words = raw.split(/\s+/).filter((w) => !STOPWORDS.has(w))
  return words.join(" ").trim() || null
}

/** Extrae la referencia a un producto mencionado en un mensaje. */
export function extractProductRef(message: string): string | null {
  const raw = extractAfter(message, PRODUCT_MARKERS)
  if (!raw) return null
  const withoutPrice = raw.replace(/\s+\d+(?:[.,]\d+)?\s*$/g, "").trim()
  const words = withoutPrice.split(/\s+/).filter((w) => !STOPWORDS.has(w))
  const cleaned = words.join(" ").trim()
  return cleaned || null
}

/** Extrae la referencia a un gasto mencionado en un mensaje. */
export function extractExpenseRef(message: string): string | null {
  return extractAfter(message, EXPENSE_MARKERS)
}

/** Extrae la referencia a un pedido (por número o marcador). */
export function extractOrderRef(message: string): string | null {
  const marked = extractAfter(message, ORDER_MARKERS)
  if (marked) return marked
  const bare = message.match(/\b(\d{1,10})\b/)
  return bare ? bare[1] : null
}

/**
 * Extrae los parámetros conocidos de un mensaje según el dominio.
 * Es un complemento de la extracción 5C: aquí se priorizan los campos de acción.
 */
export function extractKnownParams(message: string, domain: ActionDomain, previous: KnownParams = {}): KnownParams {
  const params: KnownParams = { ...previous }

  if (domain === "inventario" || domain === "ventas") {
    const price = extractAmount(message)
    if (price && /precio|por\s*\$|cuesta|vale/.test(message)) params.precio = price
  }

  const amount = extractAmount(message)
  if (domain === "gastos" && amount) params.monto = amount
  if (domain === "proveedores" && amount) params.monto = amount

  const quantity = extractQuantity(message)
  if (quantity && domain !== "gastos") params.cantidad = quantity

  const description = extractAfter(message, ["descripcion es", "descripcion:", "descripcion", "detalle es", "detalle:"])
  if (description) params.descripcion = description

  const category = extractAfter(message, ["categoria", "categoría"])
  if (category) params.categoria = category

  const vendor = extractAfter(message, ["proveedor"])
  if (vendor) params.vendor = vendor

  const period = extractPeriod(message)
  if (period) params.fecha = period

  const payment = extractPaymentMethod(message)
  if (payment) params.metodo_pago = payment

  const phone = extractPhone(message)
  if (phone && (domain === "clientes" || domain === "ventas")) params.telefono = phone

  const discount = extractDiscount(message)
  if (discount && domain === "ventas") params.descuento = discount

  const credit = extractCredit(message)
  if (credit && domain === "ventas") params.credito = credit

  const named = extractAfter(message, ["llamado", "nombrado", "denominado", "nombre"])
  if (named && (domain === "inventario" || domain === "clientes")) params.nombre = named

  // Cliente mencionado explícitamente ("cliente María", "a María").
  if (domain === "ventas" || domain === "clientes") {
    const client = extractAfter(message, ["cliente"])
    if (client) {
      const cleaned = client.split(/\s+/).filter((w) => !STOPWORDS.has(w)).join(" ")
      if (cleaned) params.cliente = cleaned
    }
  }

  // Referencia a entidad: producto, gasto, pedido (para editar/eliminar/ver).
  if (domain === "inventario") {
    const ref = extractProductRef(message)
    if (ref) params.producto = ref
    const term = extractTerm(message)
    if (term) params.termino = term
  }
  if (domain === "clientes") {
    const term = extractTerm(message)
    if (term) params.termino = term
  }
  if (domain === "gastos") {
    const ref = extractExpenseRef(message)
    if (ref) params.gasto = ref
    // Categoría implícita: "gasto de transporte 5" → categoria "transporte".
    if (!params.categoria) {
      const m = message.match(/(?:gasto|gastos|gastado|gaste|egreso|egresos)\s+(?:de|en|por)\s+([a-záéíóúñü][a-záéíóúñü0-9 ]{1,29}?)(?=\s+(?:de|por|en|con|\d+)|$)/i)
      if (m) params.categoria = m[1].trim().replace(/[.,;]+$/g, "")
    }
  }
  if (domain === "proveedores") {
    // Proveedor implícito: "compre a mercantil 100" → vendor "mercantil".
    if (!params.vendor) {
      const v = message.match(/(?:compr(?:é|e|o)\s+a\s+|pago\s+a\s+|pagar\s+a\s+|pagu(?:é|e)\s+a\s+)([a-záéíóúñü][a-záéíóúñü0-9 ]{1,29}?)(?=\s+(?:por|de|en|con|\d+)|$)/i)
      if (v) params.vendor = v[1].trim().replace(/[.,;]+$/g, "")
    }
  }
  if (domain === "pedidos") {
    const ref = extractOrderRef(message)
    if (ref) params.pedido = ref
  }

  // Items de una venta/crédito (serializados para persistir en el contexto).
  if (domain === "ventas" || domain === "clientes") {
    const items = extractSaleItems(message)
    if (items.length > 0) params.items = JSON.stringify(items)
  }

  return params
}

/** Parámetros obligatorios que aún faltan por completar. */
export function missingParams(action: ConversationalAction, known: KnownParams): ActionParam[] {
  return action.params.filter((p) => {
    if (action.required.includes(p.key) && !known[p.key]) return true
    return false
  })
}

/** Genera la pregunta natural para el próximo parámetro que falta. */
export function nextPrompt(action: ConversationalAction, missing: ActionParam[]): string {
  if (missing.length === 0) return ""
  const param = missing[0]
  const remaining = missing.length - 1
  let prompt = param.prompt
  if (remaining > 0) prompt += ` Después necesitaré ${missing.slice(1).map((p) => p.label).join(" y ")}.`
  return prompt
}

/** Valida un valor de parámetro; devuelve error o null. */
export function validateParamValue(param: ActionParam, value: string, known: KnownParams): string | null {
  if (param.validate) return param.validate(value, known)
  if (value.trim().length === 0) return "Ese valor está vacío. Intenta de nuevo."
  if (/monto|precio/.test(param.key)) {
    const num = parseFloat(value.replace(",", "."))
    if (!Number.isFinite(num) || num <= 0) return "Ese no parece un monto válido. Escribe un número mayor a 0."
  }
  return null
}

/** true si el mensaje parece una respuesta corta a una pregunta del asistente. */
export function isShortAnswer(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  if (/^(hola|holaa+|buenas|buenos dias|buenas tardes|buenas noches|gracias|ok|okay|bye|adios|chao|que tal|como estas|como va|cómo estás|perfecto|bien)\b/i.test(trimmed)) return false
  if (trimmed.length > 45) return false
  if (/\b(registra|crear|crea|vendo|vendi|agrega|elimina|cuanto|dame|quiero|muestra|mostrar)\b/i.test(trimmed)) return false
  if (/^[+()\d][\d\s()+-]{0,}$/.test(trimmed)) return true
  return /\b[a-záéíóúñü]{2,}\b/i.test(trimmed)
}

/** Infiere el tipo de movimiento de stock a partir del verbo. */
export function inferStockType(message: string): "increase" | "decrease" | "adjustment" {
  const m = message.toLowerCase()
  if (/(aument|subir|agregar|agrega|reponer|entrada|anadir|anade|increment)/.test(m)) return "increase"
  if (/(bajar|reduc|restar|disminuir|quitar|salida)/.test(m)) return "decrease"
  return "adjustment"
}
