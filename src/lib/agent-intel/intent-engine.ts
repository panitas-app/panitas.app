/**
 * Intent Engine (FASE 4A).
 *
 * Clasifica una solicitud del usuario en una intención tipada:
 * consulta | accion | analisis | configuracion | conversacion | ayuda | reporte.
 *
 * Estrategia: clasificador determinista por señales (regex sobre texto
 * normalizado sin tildes), con scoring y confianza. No depende del LLM, por lo
 * que es testeable y determinista; la confianza permite que capas superiores
 * decidan si derivan a planificación automática o a conversación libre.
 */
import type { IntentClassification, IntentEntities, IntentType } from "./types"

const DOMAIN_SIGNALS: Record<string, string[]> = {
  inventory: ["stock", "inventario", "existencia", "existencia", "agotado", "cantidad", "producto", "articulo", "unidades", "abrazadera"],
  sales: ["venta", "ventas", "vendido", "factura", "ingreso", "pedido", "orden", "monto", "total"],
  customers: ["cliente", "clientes", "crm", "telefono", "contacto"],
  orders: ["pedido", "pedidos", "orden", "ordenes", "cancelar", "pendiente"],
  agenda: ["cita", "citas", "agenda", "reserva", "horario", "turno"],
  reports: ["reporte", "resumen", "informe", "balance"],
  analytics: ["analiza", "analisis", "tendencia", "rendimiento", "comparar", "crecimiento"],
  // FASE 4D: consultas de recomendaciones operativas.
  recommendations: ["recomend", "recomienda", "recomiendas", "recomendacion", "recomendaciones", "sugeren", "consejo", "que revisar", "que deberia revisar", "que puedo revisar", "que me aconsejas", "tips"],
  business: ["negocio", "negocios", "empresa", "como esta", "como va", "como van", "estado del negocio", "salud del negocio"],
}

const ACTION_SIGNALS = [
  "crear", "crea", "añadir", "anadir", "agregar", "registrar", "generar", "nuevo", "nueva",
  "actualizar", "modificar", "cambiar", "editar", "poner", "asignar", "enviar", "cargar",
]
const DESTRUCTIVE_SIGNALS = ["eliminar", "elimina", "borrar", "borra", "quitar", "cancelar", "cancelar la", "remover"]
const QUERY_SIGNALS = [
  "cuanto", "cuanta", "cual", "que hay", "tengo", "existe", "consulta", "buscar", "dame",
  "muestrame", "listar", "listame", "quiero ver", "cuantos", "cuantas", "hay stock", "a cuanto",
  "que productos", "que clientes", "stock bajo", "agotado", "tienen", "hay",
  "como esta", "como va", "como van", "estado del negocio",
]
const ANALYSIS_SIGNALS = [
  "analiza", "analizar", "analisis", "tendencia", "rendimiento", "por que", "comparar",
  "recomienda", "recomendar", "recomendacion", "recomendaciones", "que revisar",
  "que deberia revisar", "que puedo revisar", "optimiz", "crecimiento", "mejor producto",
  "mas vendido", "menos vendido",
]
const REPORT_SIGNALS = ["reporte", "reporte de", "resumen del", "resumen de", "informe", "cierre", "balance", "ventas del mes"]
const CONFIG_SIGNALS = [
  "configur", "ajustar", "setear", "cambiar el precio", "cambiar precio", "actualizar el",
  "editar el", "modificar el", "cambiar la", "cambiar stock", "actualizar stock", "poner precio",
]
const HELP_SIGNALS = [
  "ayuda", "ayudame", "que puedes hacer", "que podes hacer", "capacidades", "funciones",
  "como funciona", "que haces", "que puedes", "necesito ayuda",
]
const CONVERSATION_SIGNALS = [
  "hola", "buenos dias", "buenas tardes", "buenas noches", "gracias", "ok", "genial",
  "perfecto", "vale", "bien y tu", "que tal", "como estas", "hey",
]

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function countMatches(normalized: string, signals: string[]): { count: number; hits: string[] } {
  const hits: string[] = []
  let count = 0
  for (const signal of signals) {
    const target = normalize(signal)
    if (normalized.includes(target)) {
      count += 1
      hits.push(signal)
    }
  }
  return { count, hits }
}

/** Prioridad de desempate: la más "específica" primero. */
const PRIORITY: IntentType[] = ["ayuda", "configuracion", "accion", "analisis", "reporte", "consulta", "conversacion"]

function extractEntities(normalized: string): IntentEntities {
  const entities: IntentEntities = {}

  const dateMatch = normalized.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/)
  if (dateMatch) entities.fecha = dateMatch[1]

  const monthMatch = normalized.match(/(?:del|de) (mes |enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/)
  if (monthMatch) entities.periodo = monthMatch[1]

  const qtyMatch = normalized.match(/\b(\d{1,4})\s*(?:unidades|uds|unids|kg|litros)\b/)
  if (qtyMatch) entities.cantidad = qtyMatch[1]

  const productMatch = normalized.match(/(?:stock|existencia|inventario|cantidad)\s+(?:hay\s+)?(?:de\s+|del\s+)?(.{2,40})/)
  if (productMatch && !/^(stock|inventario|existencia|producto)s?$/.test(productMatch[1])) {
    entities.producto = productMatch[1].replace(/[¿?!.,;:]+$/g, "").trim()
  }

  return entities
}

export interface IntentEngineOptions {
  /** Umbral mínimo de confianza para considerar la clasificación válida. */
  minConfidence?: number
}

export class IntentEngine {
  private readonly minConfidence: number

  constructor(options: IntentEngineOptions = {}) {
    this.minConfidence = options.minConfidence ?? 0.35
  }

  classify(message: string): IntentClassification {
    const normalized = normalize(message)
    const matches = new Map<IntentType, { count: number; hits: string[] }>()
    matches.set("accion", countMatches(normalized, ACTION_SIGNALS))
    matches.set("consulta", countMatches(normalized, QUERY_SIGNALS))
    matches.set("analisis", countMatches(normalized, ANALYSIS_SIGNALS))
    matches.set("reporte", countMatches(normalized, REPORT_SIGNALS))
    matches.set("configuracion", countMatches(normalized, CONFIG_SIGNALS))
    matches.set("conversacion", countMatches(normalized, CONVERSATION_SIGNALS))
    matches.set("ayuda", countMatches(normalized, HELP_SIGNALS))

    const destructiveInfo = countMatches(normalized, DESTRUCTIVE_SIGNALS)
    const destructive = destructiveInfo.count > 0

    // Score: ponderamos para que la intención "accion" no opaque a las de lectura.
    const scored = PRIORITY.map((type) => {
      const info = matches.get(type)
      return { type, count: info?.count ?? 0, hits: info?.hits ?? [] }
    })

    const maxCount = Math.max(...scored.map((s) => s.count), 0)
    const top = scored.find((s) => s.count === maxCount && s.count > 0)

    let type: IntentType = "conversacion"
    let hits: string[] = []
    if (top && top.count > 0) {
      type = top.type
      hits = top.hits
    }

    // Acciones destructivas sin otra señal: se clasifican como "accion" para que
    // la capa las planifique y exija confirmación (nunca quedan en conversación).
    if (destructive && type === "conversacion") {
      type = "accion"
      hits = destructiveInfo.hits
    }

    const confidence = Math.min(0.5 + 0.12 * maxCount, 0.98)
    const needsTools = type !== "conversacion" && type !== "ayuda"

    const domains = Object.entries(DOMAIN_SIGNALS)
      .filter(([, signals]) => countMatches(normalized, signals).count > 0)
      .map(([domain]) => domain)

    return {
      type,
      confidence,
      domains,
      message: normalized,
      entities: extractEntities(normalized),
      destructive,
      needsTools,
      signals: hits,
    }
  }
}
