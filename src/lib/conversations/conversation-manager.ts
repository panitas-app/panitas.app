/**
 * Conversation Manager (FASE 5C).
 *
 * Orquesta toda la memoria conversacional: prepara el turno antes del LLM
 * (resuelve referencias, detecta cambio de tema, construye la memoria optimizada)
 * y lo cierra después (actualiza contexto + resumen y persiste). También crea,
 * restaura, renombra, elimina, lista y busca sesiones.
 *
 * Regla de capas: coordina `conversation-{context,memory,session,summary,
 * storage,search}`; nunca toca Prisma ni proveedores LLM.
 */
import type { StoreServiceContext } from "@/services/context"
import type { Message } from "@/lib/agent-core/types"
import type {
  ConversationContextState,
  ConversationListItem,
  ContextLifecycleOptions,
  ConversationSessionState,
  TurnOutcome,
} from "./conversation-types"
import { ConversationStorage } from "./conversation-storage"
import { ConversationSession } from "./conversation-session"
import { ConversationSearch } from "./conversation-search"
import {
  DEFAULT_CONTEXT_LIFECYCLE,
  applyTurnToContext,
  createInitialContext,
  detectTopicChange,
  isContextStale,
  resolveReferences,
} from "./conversation-context"
import type { ReferenceResolution } from "./conversation-context"
import { updateSummary } from "./conversation-summary"
import { buildMemoryFragment } from "./conversation-memory"

export interface PreparedTurn {
  conversationId: string
  resolvedMessage: string
  referenceResolved: boolean
  topicChanged: boolean
  /** Contexto del turno (ya con cambio de tema aplicado). */
  context: ConversationContextState
  /** Memoria optimizada para el LLM (nunca el historial completo). */
  memory: string
  resolution: ReferenceResolution
}

export interface ConversationManagerDeps {
  storage?: ConversationStorage
  session?: ConversationSession
  search?: ConversationSearch
  lifecycle?: ContextLifecycleOptions
}

/** Genera un título corto a partir del primer mensaje del usuario. */
export function generateTitle(message: string, maxWords = 6, maxChars = 40): string {
  const clean = message
    .trim()
    .replace(/^\/\S+\s*/, "")
    .replace(/\s+/g, " ")
  if (!clean) return ""
  const words = clean.split(" ")
  let title = words.slice(0, maxWords).join(" ")
  if (words.length > maxWords) title = `${title}…`
  if (title.length > maxChars) title = `${title.slice(0, maxChars - 1)}…`
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export class ConversationManager {
  readonly storage: ConversationStorage
  readonly session: ConversationSession
  readonly search: ConversationSearch
  private readonly lifecycle: ContextLifecycleOptions

  constructor(deps: ConversationManagerDeps = {}) {
    this.storage = deps.storage ?? new ConversationStorage()
    this.session = deps.session ?? new ConversationSession(this.storage)
    this.search = deps.search ?? new ConversationSearch(this.storage)
    this.lifecycle = deps.lifecycle ?? DEFAULT_CONTEXT_LIFECYCLE
  }

  // ── Sesiones ───────────────────────────────────────────────────────────────

  async startSession(ctx: StoreServiceContext, title?: string): Promise<ConversationSessionState> {
    return this.session.create(ctx, title)
  }

  async restoreSession(ctx: StoreServiceContext, conversationId: string): Promise<ConversationSessionState> {
    return this.session.restore(ctx, conversationId)
  }

  async listSessions(ctx: StoreServiceContext, opts: { skip?: number; take?: number; status?: string } = {}) {
    return this.session.list(ctx, opts)
  }

  async renameSession(ctx: StoreServiceContext, conversationId: string, title: string) {
    return this.session.rename(ctx, conversationId, title)
  }

  async deleteSession(ctx: StoreServiceContext, conversationId: string) {
    return this.session.delete(ctx, conversationId)
  }

  async searchSessions(ctx: StoreServiceContext, query: string, opts: { take?: number } = {}): Promise<ConversationListItem[]> {
    return this.search.search(ctx, query, { take: opts.take ?? 20 })
  }

  // ── Turno (antes del LLM) ──────────────────────────────────────────────────

  /**
   * Prepara el turno: resuelve referencias contextuales, detecta cambio de
   * tema/inactividad y construye la memoria optimizada para el agente.
   */
  async prepareTurn(ctx: StoreServiceContext, conversationId: string, message: string): Promise<PreparedTurn> {
    const now = new Date().toISOString()
    const stored = await this.storage.readContext(ctx, conversationId)
    const base = stored && !isContextStale(stored, this.lifecycle, now) ? stored : createInitialContext(now)

    const resolution = resolveReferences(message, base)
    const topicChanged = detectTopicChange(base, message, resolution.referenceResolved, this.lifecycle, now)
    const effective = topicChanged ? createInitialContext(now) : base

    const summary = await this.storage.readSummary(ctx, conversationId)
    const view = this.viewForMemory(effective, resolution)
    const memory = buildMemoryFragment(view, summary)

    return {
      conversationId,
      resolvedMessage: resolution.resolvedMessage,
      referenceResolved: resolution.referenceResolved,
      topicChanged,
      context: effective,
      memory,
      resolution,
    }
  }

  /** Contexto temporal con los parámetros del mensaje actual para la memoria. */
  private viewForMemory(context: ConversationContextState, resolution: ReferenceResolution): ConversationContextState {
    return {
      ...context,
      knownParams: {
        ...context.knownParams,
        ...(resolution.scopeParams ?? {}),
      },
    }
  }

  // ── Turno (después del LLM) ────────────────────────────────────────────────

  /**
   * Cierra el turno: actualiza contexto (entidad, parámetros, pendientes,
   * cambio de tema) y resumen, y persiste ambos. Nunca lanza: la memoria no
   * rompe la conversación.
   */
  async completeTurn(ctx: StoreServiceContext, conversationId: string, outcome: TurnOutcome): Promise<void> {
    const now = new Date().toISOString()
    try {
      const stored = await this.storage.readContext(ctx, conversationId)
      const base = stored && !isContextStale(stored, this.lifecycle, now) ? stored : createInitialContext(now)

      const resolution = resolveReferences(outcome.userMessage, base)
      const topicChanged = detectTopicChange(base, outcome.userMessage, resolution.referenceResolved, this.lifecycle, now)
      const effective = topicChanged ? createInitialContext(now) : base

      const next = applyTurnToContext(effective, resolution, outcome, now)
      await this.storage.writeContext(ctx, conversationId, next)

      const summary = await this.storage.readSummary(ctx, conversationId)
      const nextSummary = updateSummary(
        summary,
        {
          userMessage: outcome.userMessage,
          assistantMessage: outcome.assistantMessage,
          domain: next.domain,
          context: next,
          actionExecuted: outcome.confirmed === true || outcome.toolNames.length > 0,
          toolNames: outcome.toolNames,
        },
        now,
        this.lifecycle,
      )
      await this.storage.writeSummary(ctx, conversationId, nextSummary)
    } catch (error) {
      console.error("[conversation] completeTurn falló (memoria no persistida)", error)
    }
  }

  // ── Títulos automáticos ────────────────────────────────────────────────────

  /**
   * Asigna el título automático desde el primer mensaje del usuario. Solo
   * reemplaza el título por defecto "Nueva conversación".
   */
  async autoTitle(ctx: StoreServiceContext, conversationId: string, firstUserMessage: string): Promise<string | null> {
    try {
      const dto = await this.storage.getConversation(ctx, conversationId)
      if (dto.title !== "Nueva conversación") return dto.title
      const title = generateTitle(firstUserMessage)
      if (!title) return dto.title
      await this.storage.rename(ctx, conversationId, title)
      return title
    } catch {
      return null
    }
  }

  /** Mensajes del historial (limitados) para el cliente. */
  async historyMessages(ctx: StoreServiceContext, conversationId: string, limit?: number): Promise<Message[]> {
    const { messages } = await this.storage.getHistory(ctx, conversationId, { limit })
    return messages
  }
}
