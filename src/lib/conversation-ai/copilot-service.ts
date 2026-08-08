/**
 * Conversational AI Copilot (FASE 7B) — Servicio orquestador.
 *
 * Orquesta el análisis automático de una conversación del inbox: carga mensajes,
 * construye el contexto del cliente, detecta multi-intención, genera resumen
 * incremental, respuestas sugeridas ancladas en datos reales, acciones
 * inteligentes y publica eventos `conversation.*`. Usa caché incremental por
 * `lastMessageId`: si no llegaron mensajes nuevos, no reanaliza. El proveedor
 * LLM es opcional; si falla o no hay API key, la heurística es el respaldo.
 */
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { PrismaClient } from "@prisma/client"
import { serviceError } from "@/services/errors"
import { createBusinessMemoryEngine } from "@/lib/business-memory"
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import type { MemoryContext } from "@/lib/agent/memory"
import { fireDomainEvent } from "@/lib/events"
import type { InboxContext, InboxMessageDTO } from "@/lib/inbox/conversation-types"
import {
  COPILOT_EVENT_DOMAIN,
  type CopilotAnalysis,
  type CopilotProductHit,
  type CopilotQueryAnswer,
} from "./conversation-types"
import { CopilotCustomerContextService } from "./customer-context"
import { detectConversationIntent } from "./intent-detector"
import { buildCopilotSummary } from "./conversation-summary"
import { generateResponseSuggestions } from "./response-generator"
import { suggestActions } from "./action-suggestions"
import { buildQueryAnswer } from "./query-answer"
import { readCopilotMemory, recordAgentMessage, recordCopilotCustomer } from "./conversation-memory"
import { createCopilotLlmProvider, type CopilotLlmProvider } from "./copilot-llm"
import { KnowledgeService, buildKnowledgeAnswer } from "@/lib/knowledge"
import type { StoreServiceContext } from "@/services/context"

export interface CopilotCacheEntry {
  lastMessageId: string | null
  analysis: CopilotAnalysis
}

export interface CopilotServiceOptions {
  db?: PrismaClient
  provider?: CopilotLlmProvider
  memory?: BusinessMemoryEngine
  cache?: Map<string, CopilotCacheEntry>
}

function toMemoryContext(ctx: InboxContext): MemoryContext {
  return { storeId: ctx.storeId, userId: ctx.userId ?? "", negocioId: ctx.negocioId ?? undefined }
}

function cacheKey(storeId: string, conversationId: string): string {
  return `${storeId}:${conversationId}`
}

export class CopilotService {
  private readonly db: PrismaClient
  private readonly provider: CopilotLlmProvider
  private readonly memory: BusinessMemoryEngine
  private readonly cache: Map<string, CopilotCacheEntry>
  private readonly contextService: CopilotCustomerContextService

  constructor(options: CopilotServiceOptions = {}) {
    this.db = options.db ?? defaultPrisma
    this.provider = options.provider ?? createCopilotLlmProvider()
    this.memory = options.memory ?? createBusinessMemoryEngine()
    this.cache = options.cache ?? new Map()
    this.contextService = new CopilotCustomerContextService(this.db)
  }

  /** Análisis completo del copiloto con caché incremental por último mensaje. */
  async analyze(ctx: InboxContext, conversationId: string, options: { force?: boolean } = {}): Promise<CopilotAnalysis> {
    const messages = await this.load(ctx, conversationId)
    const lastMessageId = messages[messages.length - 1]?.id ?? null
    const key = cacheKey(ctx.storeId, conversationId)
    const cached = this.cache.get(key)
    if (!options.force && cached && cached.lastMessageId === lastMessageId && messages.length > 0) {
      return { ...cached.analysis, fresh: false }
    }

    const context = await this.contextService.build(ctx, conversationId)
    const memory = await readCopilotMemory(this.memory, toMemoryContext(ctx))
    const intent = detectConversationIntent(messages)
    const lastCustomerContent = [...messages].reverse().find((m) => m.sender === "customer")?.content ?? ""
    const inventoryHits = await this.contextService.findProducts(ctx, lastCustomerContent, 5)
    const suggestions = generateResponseSuggestions({
      intent,
      messages,
      context,
      memory,
      inventoryHits,
      customerName: context.customer?.name ?? null,
    })
    const actions = suggestActions({
      intent,
      customerId: context.customer?.id ?? null,
      hasPendingOrders: context.pendingOrders.length > 0,
      hasActiveCredits: context.credits.activeCredits > 0,
      totalDebt: context.totalDebt,
      hasInventoryHits: inventoryHits.length > 0,
    })
    const summary = buildCopilotSummary(messages, { customerName: context.customer?.name ?? null })
    const lastAgentContent = [...messages].reverse().find((m) => m.sender === "agent")?.content

    const grounded = buildGroundedContext(context, inventoryHits)
    let source: CopilotAnalysis["source"] = this.provider.id === "heuristic" ? "heuristic" : "ai"
    let finalSuggestions = suggestions
    try {
      const refined = await this.provider.refineSuggestions(suggestions, grounded)
      if (refined.length > 0) finalSuggestions = refined
    } catch {
      source = "heuristic"
    }

    const analysis: CopilotAnalysis = {
      conversationId,
      generatedAt: new Date().toISOString(),
      lastMessageId,
      summary,
      intent,
      suggestions: finalSuggestions,
      actions,
      context,
      source,
      fresh: true,
    }

    this.cache.set(key, { lastMessageId, analysis })
    await this.publishEvents(ctx, conversationId, analysis)
    await this.learn(ctx, conversationId, analysis, lastAgentContent)

    return analysis
  }

  /** Consulta en lenguaje natural sobre el cliente y la conversación. */
  async query(ctx: InboxContext, conversationId: string, question: string): Promise<CopilotQueryAnswer> {
    const q = question.trim()
    if (!q) throw serviceError("Escribe una pregunta para consultar", 400)

    const context = await this.contextService.build(ctx, conversationId)
    const inventoryHits = await this.contextService.findProducts(ctx, q, 5)
    const draft = buildQueryAnswer({
      question: q,
      customerName: context.customer?.name ?? null,
      context,
      inventoryHits,
    })

    // Base de Conocimiento (FASE 7D): si la pregunta no es de datos del
    // cliente, se busca primero en la KB del negocio y se responde con cita.
    const knowledge = await this.queryKnowledgeBase(ctx, q)
    const selected = knowledge ?? draft
    const grounded = [
      buildGroundedContext(context, inventoryHits),
      ...(knowledge ? [knowledge.content] : []),
    ].filter(Boolean).join("\n")

    try {
      return await this.provider.refineQueryAnswer(selected, grounded)
    } catch {
      return selected
    }
  }

  /** Busca en la Base de Conocimiento del negocio (solo para intent "otro"). */
  private async queryKnowledgeBase(ctx: InboxContext, question: string): Promise<CopilotQueryAnswer | null> {
    const { detectQueryIntent } = await import("./intent-detector")
    if (detectQueryIntent(question) !== "otro") return null

    const service = new KnowledgeService({ prisma: this.db, source: "copilot" })
    const storeCtx: StoreServiceContext = { storeId: ctx.storeId, userId: ctx.userId ?? "copilot" }
    const result = await service.search(storeCtx, { query: question, limit: 3 })
    if (result.hits.length === 0) return null

    const answer = buildKnowledgeAnswer({
      query: question,
      hits: result.hits.map((h) => ({ document: h.document, score: h.score, snippet: h.snippet })),
    })
    return {
      question,
      queryIntent: "otro",
      content: answer.content,
      dataSources: answer.dataSources,
    }
  }

  /** Estado en caché (sin reanalizar) o null si no existe. */
  getCached(storeId: string, conversationId: string): CopilotAnalysis | null {
    return this.cache.get(cacheKey(storeId, conversationId))?.analysis ?? null
  }

  clearCache(storeId: string, conversationId: string): void {
    this.cache.delete(cacheKey(storeId, conversationId))
  }

  private async publishEvents(ctx: InboxContext, conversationId: string, analysis: CopilotAnalysis): Promise<void> {
    const base = {
      aggregateId: conversationId,
      aggregateType: "InboxConversation",
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "copilot",
    }

    fireDomainEvent({
      ...base,
      type: "conversation.intent.detected",
      data: {
        conversationId,
        domain: COPILOT_EVENT_DOMAIN,
        intents: analysis.intent.intents,
        primaryIntent: analysis.intent.primaryIntent,
        sentiment: analysis.intent.sentiment,
        confidence: analysis.intent.confidence,
      },
    })
    fireDomainEvent({
      ...base,
      type: "conversation.summary.updated",
      data: { conversationId, domain: COPILOT_EVENT_DOMAIN, summary: analysis.summary.text, lastMessageId: analysis.lastMessageId },
    })
    fireDomainEvent({
      ...base,
      type: "conversation.response.generated",
      data: {
        conversationId,
        domain: COPILOT_EVENT_DOMAIN,
        suggestions: analysis.suggestions.map((s) => ({ text: s.text, grounded: s.grounded, dataSources: s.dataSources })),
      },
    })
    fireDomainEvent({
      ...base,
      type: "conversation.action.suggested",
      data: {
        conversationId,
        domain: COPILOT_EVENT_DOMAIN,
        actions: analysis.actions.map((a) => ({ type: a.type, label: a.label, href: a.href })),
      },
    })
  }

  private async learn(ctx: InboxContext, _conversationId: string, analysis: CopilotAnalysis, agentContent?: string): Promise<void> {
    const memoryCtx = toMemoryContext(ctx)

    await Promise.allSettled([
      recordAgentMessage(this.memory, memoryCtx, { content: agentContent }),
      recordCopilotCustomer(this.memory, memoryCtx, {
        customerId: analysis.context?.customer?.id,
        customerName: analysis.context?.customer?.name,
      }),
    ])
  }

  private async load(ctx: InboxContext, conversationId: string): Promise<InboxMessageDTO[]> {
    const conversation = await this.db.inboxConversation.findUnique({
      where: { id: conversationId },
      select: { storeId: true, messages: { orderBy: { createdAt: "asc" as const } } },
    })
    if (!conversation || conversation.storeId !== ctx.storeId) throw serviceError("Conversación no encontrada", 404)
    return conversation.messages.map((m) => ({
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
  }
}

/** Contexto compacto y real para anclar las respuestas del LLM. */
function buildGroundedContext(context: Awaited<ReturnType<CopilotCustomerContextService["build"]>>, hits: CopilotProductHit[]): string {
  const c = context.customer
  const parts: string[] = []
  if (c) {
    parts.push(
      `Cliente: ${c.name} | ${c.phone} | ${c.totalOrders} compras | ${c.totalSpent.toFixed(2)} USD gastados | última compra: ${c.lastPurchaseAt ?? "sin registro"}`,
    )
  }
  if (context.orders.length > 0) {
    parts.push(
      `Pedidos: ${context.orders
        .slice(0, 3)
        .map((o) => `${o.orderNumber} (${o.status}) ${o.total.toFixed(2)} USD`)
        .join(" | ")}`,
    )
  }
  if (context.credits.activeCredits > 0) {
    parts.push(`Crédito: ${context.credits.activeCredits} activo(s), pendiente ${context.credits.pendingAmount.toFixed(2)} USD, vencido ${context.credits.overdueAmount.toFixed(2)} USD`)
  }
  if (hits.length > 0) {
    parts.push(`Inventario: ${hits.map((p) => `${p.name} — ${p.price.toFixed(2)} USD — stock ${p.stock}`).join(" | ")}`)
  }
  return parts.join("\n")
}
