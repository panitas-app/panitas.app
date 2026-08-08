/**
 * Omnichannel Inbox — IA de conversaciones (FASE 7A).
 *
 * Panitas analiza la conversación y SUGIERE respuestas. Nunca envía nada
 * automáticamente: el resultado llega al usuario como borrador que decide
 * editar o enviar.
 *
 * Acciones IA: resumir conversación, analizar intención, sugerir respuesta y
 * mostrar historial relevante. El proveedor de IA es inyectable; por defecto
 * se usa un proveedor heurístico determinista (sin red) para que el sistema
 * funcione sin API key y los tests sean estables. Los resultados se persisten
 * en `InboxAiSummary` con su fuente (`ai` | `heuristic`).
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import {
  INBOX_INTENTS,
  type InboxAiActionKind,
  type InboxAiResult,
  type InboxContext,
  type InboxIntent,
  type InboxMessageDTO,
  type InboxSentiment,
} from "./conversation-types"

export type { InboxAiActionKind, InboxAiResult } from "./conversation-types"

export interface InboxIntentAnalysis {
  intent: InboxIntent
  sentiment: InboxSentiment
  topics: string[]
  confidence: "high" | "medium" | "low"
}

export interface InboxAiContext {
  customerName?: string | null
}

export interface InboxAiProvider {
  summarize(messages: InboxMessageDTO[], context?: InboxAiContext): Promise<string>
  analyzeIntent(messages: InboxMessageDTO[]): Promise<InboxIntentAnalysis>
  suggestReply(messages: InboxMessageDTO[], context?: InboxAiContext): Promise<string>
  findRelevantHistory(query: string, messages: InboxMessageDTO[]): Promise<string>
}

const STOPWORDS = new Set([
  "para", "esta", "este", "pero", "como", "cuando", "porque", "entonces", "también", "ademas",
  "usted", "ellos", "ellas", "entre", "estas", "quiero", "puedo", "puede", "saber", "ver",
  "cliente", "negocio", "favor", "puedes", "podria", "gracias", "muchas", "buenos", "buenas",
])

const INTENT_KEYWORDS: Record<InboxIntent, string[]> = {
  reclamo: ["queja", "reclamo", "devolver", "reembolso", "cambio", "defectuoso", "no llego", "no me gusto", "mal servicio"],
  soporte: ["problema", "error", "no funciona", "ayuda", "configurar", "no puedo", "falla", "cuenta", "asistencia", "revisar"],
  pedido: ["pedido", "orden", "entrega", "envio", "seguimiento", "guia", "estado de mi pedido", "cuando llega"],
  cobranza: ["debo", "pago", "cuota", "abono", "vencido", "saldo", "deuda", "recibo", "resta", "cuanto debo", "facilidades"],
  venta: ["precio", "cuanto cuesta", "disponible", "tienen", "comprar", "costo", "venden", "stock", "talla", "color", "quiero comprar", "oferta", "envian"],
  consulta: ["horario", "direccion", "ubican", "abren", "atienden", "consulta", "informacion", "ubicacion", "whatsapp"],
  otro: [],
}

const NEGATIVE_WORDS = ["mal", "no llego", "no me gusto", "queja", "reclamo", "error", "problema", "no funciona", "falla", "devolver", "tardo", "nunca", "defectuoso"]
const POSITIVE_WORDS = ["gracias", "perfecto", "excelente", "me encanta", "genial", "me gusta", "super", "buenisimo", "muy bien", "great"]

const INTENT_LABELS: Record<InboxIntent, string> = {
  venta: "venta",
  soporte: "soporte",
  cobranza: "cobranza",
  consulta: "consulta",
  pedido: "pedido",
  reclamo: "reclamo",
  otro: "otro",
}

const SUGGESTION_TEMPLATES: Record<InboxIntent, string> = {
  venta: "Hola {name}, sí tenemos disponibilidad. ¿Te ayudo con la compra o deseas reservarlo?",
  consulta: "Hola {name}, claro que sí. Te comento con gusto: para cualquier duda adicional, aquí estoy.",
  soporte: "Hola {name}, entiendo el inconveniente. Voy a revisarlo y te confirmo en un momento.",
  pedido: "Hola {name}, te confirmo el estado de tu pedido. Déjame verificar los detalles para darte una respuesta exacta.",
  cobranza: "Hola {name}, te recuerdo que tienes una cuota pendiente. ¿Podrías realizarla hoy? Con gusto te ayudo con el abono.",
  reclamo: "Hola {name}, lamento lo sucedido. Lo reviso de inmediato y te ofrezco una solución lo antes posible.",
  otro: "Hola {name}, con gusto te atiendo. ¿En qué más puedo ayudarte?",
}

function customerMessages(messages: InboxMessageDTO[]): InboxMessageDTO[] {
  return messages.filter((m) => m.sender === "customer")
}

function lastCustomerMessage(messages: InboxMessageDTO[]): string {
  const customers = customerMessages(messages)
  return customers[customers.length - 1]?.content ?? ""
}

/** Normaliza a minúsculas y sin tildes para que "no llegó" coincida con "no llego". */
function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function countHits(text: string, keywords: string[]): number {
  const lower = normalize(text)
  return keywords.reduce((acc, k) => (lower.includes(k) ? acc + 1 : acc), 0)
}

function detectIntent(messages: InboxMessageDTO[]): {
  intent: InboxIntent
  confidence: "high" | "medium" | "low"
} {
  const text = customerMessages(messages).map((m) => m.content).join(" \n ")
  let best: InboxIntent = "otro"
  let bestScore = 0
  for (const intent of INBOX_INTENTS) {
    if (intent === "otro") continue
    const score = countHits(text, INTENT_KEYWORDS[intent])
    if (score > bestScore) {
      best = intent
      bestScore = score
    }
  }
  if (best === "otro" && text.trim().length === 0) {
    return { intent: "otro", confidence: "low" }
  }
  const confidence: "high" | "medium" | "low" = bestScore >= 2 ? "high" : bestScore === 1 ? "medium" : "low"
  return { intent: best, confidence }
}

function detectSentiment(messages: InboxMessageDTO[]): InboxSentiment {
  const text = normalize(customerMessages(messages).map((m) => m.content).join(" \n "))
  const negative = NEGATIVE_WORDS.filter((w) => text.includes(w)).length
  const positive = POSITIVE_WORDS.filter((w) => text.includes(w)).length
  if (negative > positive) return "negative"
  if (positive > negative) return "positive"
  return "neutral"
}

function extractTopics(messages: InboxMessageDTO[]): string[] {
  const counts = new Map<string, number>()
  for (const message of customerMessages(messages)) {
    const words = normalize(message.content)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

/** Proveedor heurístico determinista: funciona sin API key y es 100% testeable. */
export class HeuristicInboxAiProvider implements InboxAiProvider {
  async summarize(messages: InboxMessageDTO[], context?: InboxAiContext): Promise<string> {
    if (messages.length === 0) return "La conversación todavía no tiene mensajes."
    const last = lastCustomerMessage(messages)
    const intent = detectIntent(messages)
    const name = context?.customerName?.trim()
    const who = name ? ` con ${name}` : ""
    const head = `${messages.length} mensaje${messages.length === 1 ? "" : "s"}${who}`
    if (messages.length <= 2) {
      return `${head}. Último mensaje del cliente: "${last.slice(0, 100)}".`
    }
    return `${head}. Intención detectada: ${INTENT_LABELS[intent.intent]}. Último mensaje del cliente: "${last.slice(0, 100)}".`
  }

  async analyzeIntent(messages: InboxMessageDTO[]): Promise<InboxIntentAnalysis> {
    const { intent, confidence } = detectIntent(messages)
    return {
      intent,
      sentiment: detectSentiment(messages),
      topics: extractTopics(messages),
      confidence,
    }
  }

  async suggestReply(messages: InboxMessageDTO[], context?: InboxAiContext): Promise<string> {
    const { intent } = detectIntent(messages)
    const name = context?.customerName?.trim() || "estimado cliente"
    const template = SUGGESTION_TEMPLATES[intent] ?? SUGGESTION_TEMPLATES.otro
    return template.replace("{name}", name)
  }

  async findRelevantHistory(query: string, messages: InboxMessageDTO[]): Promise<string> {
    const keywords = normalize(query)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
    if (keywords.length === 0) {
      const matches = messages.slice(-3).map((m) => `[${m.sender}] ${m.content.slice(0, 120)}`)
      return matches.length ? matches.join("\n") : "No hay historial para mostrar."
    }
    const matches = messages.filter((m) => keywords.some((k) => normalize(m.content).includes(k)))
    if (matches.length === 0) return "Sin coincidencias en el historial de esta conversación."
    return matches
      .slice(-5)
      .map((m) => `[${m.sender}] ${m.content.slice(0, 160)}`)
      .join("\n")
  }
}

export class InboxConversationAiService {
  constructor(
    private readonly db: PrismaClient = defaultPrisma,
    private readonly provider: InboxAiProvider = new HeuristicInboxAiProvider(),
  ) {}

  async summarize(ctx: InboxContext, conversationId: string): Promise<InboxAiResult> {
    const { messages, name } = await this.load(ctx, conversationId)
    return this.run(ctx, conversationId, "summary", async () => ({
      content: await this.provider.summarize(messages, { customerName: name }),
    }))
  }

  async analyzeIntent(ctx: InboxContext, conversationId: string): Promise<InboxAiResult> {
    const { messages } = await this.load(ctx, conversationId)
    return this.run(ctx, conversationId, "intent", async () => {
      const analysis = await this.provider.analyzeIntent(messages)
      return { content: this.formatIntent(analysis), structured: analysis }
    })
  }

  async suggestReply(ctx: InboxContext, conversationId: string): Promise<InboxAiResult> {
    const { messages, name } = await this.load(ctx, conversationId)
    return this.run(ctx, conversationId, "suggestion", async () => {
      const suggestion = await this.provider.suggestReply(messages, { customerName: name })
      return { content: suggestion, structured: { suggestion } }
    })
  }

  async relevantHistory(ctx: InboxContext, conversationId: string, query: string): Promise<InboxAiResult> {
    const { messages } = await this.load(ctx, conversationId)
    return this.run(ctx, conversationId, "relevant_history", async () => ({
      content: await this.provider.findRelevantHistory(query, messages),
    }))
  }

  /** Lista los análisis IA guardados de una conversación (más recientes primero). */
  async list(ctx: InboxContext, conversationId: string, kind?: InboxAiActionKind): Promise<InboxAiResult[]> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      select: { storeId: true },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) throw serviceError("Conversación no encontrada", 404)

    const rows = await this.db.inboxAiSummary.findMany({
      where: { conversationId, storeId: ctx.storeId, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" as const },
      take: 10,
    })
    return rows.map((r) => {
      const payload = this.parsePayload(r.payload)
      return {
        kind: r.kind as InboxAiActionKind,
        content: typeof payload.content === "string" ? payload.content : "",
        structured: payload.structured,
        source: (r.source === "ai" ? "ai" : "heuristic") as InboxAiResult["source"],
        conversationId: r.conversationId,
        createdAt: r.createdAt.toISOString(),
      }
    })
  }

  private async run(
    ctx: InboxContext,
    conversationId: string,
    kind: InboxAiActionKind,
    operation: () => Promise<{ content: string; structured?: unknown }>,
  ): Promise<InboxAiResult> {
    const heuristic = new HeuristicInboxAiProvider()
    let content: string
    let structured: unknown
    let source: InboxAiResult["source"] = "ai"
    try {
      const result = await operation()
      content = result.content
      structured = result.structured
    } catch {
      source = "heuristic"
      const fallback: Record<InboxAiActionKind, Promise<{ content: string; structured?: unknown }>> = {
        summary: heuristic.summarize([], {}).then((c) => ({ content: c })),
        intent: heuristic.analyzeIntent([]).then((a) => ({ content: this.formatIntent(a), structured: a })),
        suggestion: heuristic.suggestReply([], {}).then((c) => ({ content: c })),
        relevant_history: Promise.resolve({ content: "No se pudo analizar. Revisa la conversación manualmente." }),
      }
      const fallbackResult = await fallback[kind]
      content = fallbackResult.content
      structured = fallbackResult.structured
    }

    const createdAt = new Date()
    await this.db.inboxAiSummary.create({
      data: {
        storeId: ctx.storeId,
        conversationId,
        kind,
        payload: JSON.stringify({ content, structured }),
        source,
      },
    })
    await this.trimHistory(conversationId, kind)

    return { kind, content, structured, source, conversationId, createdAt: createdAt.toISOString() }
  }

  private async trimHistory(conversationId: string, kind: string): Promise<void> {
    const rows = await this.db.inboxAiSummary.findMany({
      where: { conversationId, kind },
      orderBy: { createdAt: "desc" as const },
      select: { id: true },
      take: 4,
    })
    const keepIds = rows.map((r) => r.id)
    await this.db.inboxAiSummary.deleteMany({
      where: { conversationId, kind, id: { notIn: keepIds } },
    })
  }

  private formatIntent(analysis: InboxIntentAnalysis): string {
    const sentimentLabel: Record<InboxSentiment, string> = {
      positive: "positivo",
      neutral: "neutral",
      negative: "negativo",
    }
    const topics = analysis.topics.length > 0 ? analysis.topics.join(", ") : "—"
    return `Intención: ${INTENT_LABELS[analysis.intent]} | Sentimiento: ${sentimentLabel[analysis.sentiment]} | Temas: ${topics}`
  }

  private async load(ctx: InboxContext, conversationId: string): Promise<{
    messages: InboxMessageDTO[]
    name: string | null
  }> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" as const } },
      },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) throw serviceError("Conversación no encontrada", 404)
    const messages: InboxMessageDTO[] = conversation.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      channel: m.channel as InboxMessageDTO["channel"],
      sender: m.sender as InboxMessageDTO["sender"],
      authorId: m.authorId,
      senderName: m.senderName,
      recipient: m.recipient,
      content: m.content,
      contentType: m.contentType as InboxMessageDTO["contentType"],
      attachments: [],
      status: m.status as InboxMessageDTO["status"],
      createdAt: m.createdAt.toISOString(),
    }))
    return { messages, name: conversation.customer?.name ?? null }
  }

  private parsePayload(raw: string): { content?: unknown; structured?: unknown } {
    try {
      return JSON.parse(raw) as { content?: unknown; structured?: unknown }
    } catch {
      return {}
    }
  }
}
