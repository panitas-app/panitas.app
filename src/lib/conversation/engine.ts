/**
 * Conversation Engine (FASE 3C + 4A).
 *
 * Coordina un turno de chat persistente:
 *
 *   1. Asegura la conversación (reutiliza si `conversationId` es del usuario, si no crea).
 *   2. Guarda el mensaje del usuario en BD.
 *   3. Construye el contexto conversacional con historial limitado.
 *   4. FASE 4A: si hay Intelligence Layer, la invoca (intención → plan → confirmación
 *      o ejecución multi-tool → síntesis). Según el resultado:
 *      - `no_tools`: se delega directo al Agent Core (conversación/ayuda).
 *      - `confirmation_required`: se responde SIN LLM pidiendo la confirmación.
 *      - `completed` con resultados: se inyecta el contexto sintetizado y el LLM
 *        genera la respuesta final con evidencia.
 *      - `completed` sin resultados: respuesta determinista sin llamar al LLM.
 *   5. Delega el turno al Agent Core (pipeline 3A) cuando hace falta LLM.
 *   6. Guarda la respuesta del asistente (+ toolCalls y metadatos).
 *   7. Devuelve `{ conversationId, message, response, metadata }`.
 *
 * El agent NUNCA toca la BD: recibe el historial vía `AgentRequest.history`.
 */
import { ConversationService } from "@/services/conversation.service"
import { permissionsForRole } from "@/lib/agent/permissions/agent.roles"
import type { PanitasAgent } from "@/lib/agent-core"
import type { AgentRequest, Message, ResolvedToolCall, UsageInfo } from "@/lib/agent-core/types"
import type { IntelligenceLayer } from "@/lib/agent-intel"
import type { ConfirmationRequest, StepExecutionResult } from "@/lib/agent-intel/types"
import { buildConversationalHistory } from "./context-builder"
import type { StoreServiceContext } from "@/services/context"
import type { BusinessContextBuilder } from "@/lib/agent/context"
import type { MemoryManager, MemoryTurn } from "@/lib/agent/memory"
import type { ConversationManager } from "@/lib/conversations"
import type { ConversationalActionsEngine } from "@/lib/conversational-actions"
import type { BusinessMemoryEngine } from "@/lib/business-memory"
import { fireDomainEvent } from "@/lib/events"

export type ChatTurnInput = {
  conversationId?: string
  message: string
  /** FASE 4A: IDs de pasos confirmados por el usuario (segunda vuelta de confirmación). */
  confirmedStepIds?: string[]
}

export type ChatTurnResult = {
  conversationId: string
  message: Message
  response: {
    reply: string
    provider: string
    model: string
    toolCalls: ResolvedToolCall[]
    usage?: UsageInfo
    ok: boolean
    error?: string
  }
  metadata: Record<string, unknown>
  /** FASE 4C: solicitud de confirmación activa (solo cuando metadata.status === "confirmation_required"). */
  confirmation?: ConfirmationRequest
  /** FASE 5D: respuesta enriquecida (tarjetas, tablas, resúmenes) para el cliente. */
  rich?: import("@/lib/conversational-actions").RichResponse
}

export type ConversationEngineDeps = {
  agent: PanitasAgent
  conversations: ConversationService
  /** FASE 3D: Memory System opcional (recuperación + extracción de turnos). */
  memory?: MemoryManager
  /** FASE 3D: Business Context opcional (perfil + memoria en el request del agente). */
  context?: BusinessContextBuilder
  /** FASE 4A: Intelligence Layer opcional (intención, plan, orquestación multi-tool). */
  intelligence?: IntelligenceLayer
  /** FASE 5C: Memoria conversacional opcional (contexto estructurado por sesión). */
  conversational?: ConversationManager
  /** FASE 5D: Conversational Actions opcional (orquesta tools 3B + services 1B). */
  actions?: ConversationalActionsEngine
  /** FASE 5G: Memoria estable del negocio opcional (terminología/preferencias/reglas/uso). */
  businessMemory?: BusinessMemoryEngine
}

function toResolvedToolCalls(results: StepExecutionResult[]): ResolvedToolCall[] {
  return results.map((r) => ({
    name: r.tool,
    input: r.input ?? {},
    ok: r.status === "ok",
    output: r.status === "ok" ? JSON.stringify(r.output?.data ?? null) : undefined,
    error: r.status === "error" ? (r.error ?? "fallo de herramienta") : undefined,
  }))
}

export class ConversationEngine {
  constructor(private readonly deps: ConversationEngineDeps) {}

  /** FASE 5G: aprendizaje de la memoria estable (best-effort, nunca bloquea el turno). */
  private learnFromTurn(ctx: StoreServiceContext, message: string, intent?: string, domains?: string[]): void {
    fireDomainEvent({
      type: "assistant.memory.updated",
      data: { message: message.slice(0, 200), intent },
      tenantId: ctx.storeId,
      actorId: ctx.userId,
      source: "conversation.engine",
    })
    if (!this.deps.businessMemory) return
    void this.deps.businessMemory
      .learnFromTurn({ userId: ctx.userId, storeId: ctx.storeId, negocioId: ctx.negocioId }, { message, intent, domains })
      .catch((error: unknown) => console.error("[conversation] aprendizaje de memoria estable falló", error))
  }

  async chat(ctx: StoreServiceContext, input: ChatTurnInput): Promise<ChatTurnResult> {
    const conversation = await this.deps.conversations.ensureConversation(ctx, input.conversationId)

    // FASE 5C: título automático desde el primer mensaje de una conversación nueva.
    const isNewConversation = conversation.messageCount === 0
    if (isNewConversation) {
      await this.deps.conversational?.autoTitle(ctx, conversation.id, input.message)
    }

    const userMessage = await this.deps.conversations.saveMessage(ctx, conversation.id, {
      role: "user",
      content: input.message,
    })

    const { messages: history } = await this.deps.conversations.getHistory(ctx, conversation.id)
    const limitedHistory = buildConversationalHistory(history)

    const memoryCtx = { userId: ctx.userId, storeId: ctx.storeId, negocioId: ctx.negocioId ?? undefined }

    let businessContext: string | undefined
    let memoryContext: string | undefined
    try {
      if (this.deps.context) {
        const bundle = await this.deps.context.build(ctx, input.message)
        businessContext = this.deps.context.toBusinessFragment(bundle)
        memoryContext = this.deps.context.toMemoryFragment(bundle)
      } else if (this.deps.memory) {
        memoryContext = await this.deps.memory.buildMemoryContext(memoryCtx, input.message)
      }
    } catch (error) {
      // FASE 3D: el contexto/memoria nunca rompe el turno (mejor sin contexto que sin respuesta).
      console.error("[conversation] no se pudo construir contexto/memoria", error)
    }

    // FASE 5C: prepara el turno con la memoria conversacional (referencias,
    // cambio de tema, contexto optimizado). Nunca rompe el turno.
    let prepared: Awaited<ReturnType<ConversationManager["prepareTurn"]>> | null = null
    try {
      prepared = await this.deps.conversational?.prepareTurn(ctx, conversation.id, input.message) ?? null
    } catch (error) {
      console.error("[conversation] no se pudo preparar la memoria conversacional", error)
    }

    const resolvedMessage = prepared?.resolvedMessage ?? input.message
    if (prepared?.memory) {
      memoryContext = [prepared.memory, memoryContext].filter(Boolean).join("\n\n")
    }

    // FASE 5G: recupera SOLO los recuerdos estables relevantes por intención
    // (terminología, preferencias, reglas, uso) para adaptar la respuesta.
    // Nunca se envía toda la memoria y nunca rompe el turno.
    let businessMemoryContext: string | undefined
    try {
      if (this.deps.businessMemory) {
        const result = await this.deps.businessMemory.queryForIntent(memoryCtx, {
          message: resolvedMessage,
        })
        businessMemoryContext = result.context
      }
    } catch (error) {
      console.error("[conversation] no se pudo recuperar la memoria estable del negocio", error)
    }

    const request: AgentRequest = {
      userId: ctx.userId,
      storeId: ctx.storeId,
      negocioId: ctx.negocioId ?? null,
      plan: ctx.plan ?? "business",
      role: ctx.role ?? "admin",
      permissions: permissionsForRole(ctx.role ?? "admin"),
      message: resolvedMessage,
      sessionId: conversation.id,
      history: limitedHistory,
      taskType: "chat",
      businessContext,
      memoryContext: [memoryContext, businessMemoryContext].filter(Boolean).join("\n\n"),
      metadata: {
        businessName: ctx.storeName,
        conversationId: conversation.id,
      },
    }

    // FASE 4A — Intelligence Layer: intención → plan → confirmación o ejecución → síntesis.
    let intelligenceToolCalls: ResolvedToolCall[] = []
    let layerIntent: string | undefined
    let layerDomains: string[] | undefined
    let layerTrace: unknown

    // FASE 5C: persiste la memoria conversacional tras el turno (best-effort).
    const finalize = (
      replyText: string,
      toolNames: ResolvedToolCall[],
      confirmed: boolean,
      actionOutcome: { actionId?: string; knownParams?: Record<string, string>; contextStatus?: import("@/lib/conversations").ConversationContextState["status"] } = {},
    ) => {
      if (layerIntent) {
        fireDomainEvent({
          type: "assistant.context.updated",
          data: { conversationId: conversation.id, intent: layerIntent, confirmed },
          aggregateId: conversation.id,
          aggregateType: "Conversation",
          tenantId: ctx.storeId,
          actorId: ctx.userId,
          source: "conversation.engine",
        })
      }
      return this.deps.conversational?.completeTurn(ctx, conversation.id, {
        userMessage: input.message,
        assistantMessage: replyText,
        toolNames: toolNames.map((t) => t.name),
        confirmed,
        intent: layerIntent,
        ...actionOutcome,
      })
    }

    // FASE 5D — Conversational Actions: orquesta tools 3B + services 1B de forma
    // determinista. Si detecta una acción, responde SIN llamar al LLM.
    if (this.deps.actions) {
      const actionResult = await this.deps.actions.run({
        message: input.message,
        ctx,
        runtime: {
          userId: ctx.userId,
          storeId: ctx.storeId,
          negocioId: ctx.negocioId ?? null,
          plan: ctx.plan ?? "business",
          role: ctx.role ?? "admin",
          permissions: request.permissions,
        },
        confirmed: Boolean(input.confirmedStepIds?.length),
        previous: prepared?.context
          ? {
              actionId: prepared.context.actionId,
              knownParams: prepared.context.knownParams ?? {},
              status: prepared.context.status,
            }
          : undefined,
      })

      if (actionResult.status !== "no_action") {
        layerIntent = `action.${actionResult.actionId ?? "unknown"}`

        fireDomainEvent({
          type: "conversation.intent.detected",
          data: { conversationId: conversation.id, intent: layerIntent, message: input.message.slice(0, 200) },
          aggregateId: conversation.id,
          aggregateType: "Conversation",
          tenantId: ctx.storeId,
          actorId: ctx.userId,
          source: "conversation.engine",
        })

        await this.deps.conversations.saveMessage(ctx, conversation.id, {
          role: "assistant",
          content: actionResult.reply,
          toolCalls: [],
          metadata: {
            provider: "actions",
            model: "deterministic",
            status: actionResult.status,
            ...(actionResult.actionId ? { actionId: actionResult.actionId } : {}),
          },
        })

        this.learnFromTurn(ctx, input.message, layerIntent, layerDomains)

        await finalize(
          actionResult.reply,
          [],
          actionResult.status === "completed" || Boolean(input.confirmedStepIds?.length),
          {
            actionId: actionResult.actionId,
            knownParams: actionResult.knownParams,
            contextStatus: actionResult.contextStatus,
          },
        )

        return {
          conversationId: conversation.id,
          message: userMessage,
          response: {
            reply: actionResult.reply,
            provider: "actions",
            model: "deterministic",
            toolCalls: [],
            ok: true,
          },
          metadata: {
            status: actionResult.status,
            ...(actionResult.actionId ? { actionId: actionResult.actionId } : {}),
          },
          ...(actionResult.confirmation ? { confirmation: actionResult.confirmation } : {}),
          ...(actionResult.rich ? { rich: actionResult.rich } : {}),
        }
      }
    }

    if (this.deps.intelligence) {
      const layerResult = await this.deps.intelligence.run({
        request,
        toolContext: {
          userId: ctx.userId,
          storeId: ctx.storeId,
          negocioId: ctx.negocioId ?? null,
          plan: ctx.plan ?? "business",
          role: ctx.role ?? "admin",
          permissions: request.permissions,
        },
        confirmedStepIds: input.confirmedStepIds,
      })

      layerIntent = layerResult.intent?.type
      layerDomains = layerResult.intent?.domains
      layerTrace = layerResult.trace

      if (layerIntent) {
        fireDomainEvent({
          type: "conversation.intent.detected",
          data: {
            conversationId: conversation.id,
            intent: layerIntent,
            domains: layerDomains,
            message: input.message.slice(0, 200),
          },
          aggregateId: conversation.id,
          aggregateType: "Conversation",
          tenantId: ctx.storeId,
          actorId: ctx.userId,
          source: "conversation.engine",
        })
      }

      if (layerResult.status === "confirmation_required") {
        // No se ejecuta nada: se devuelve la solicitud de confirmación SIN llamar al LLM.
        const reply = layerResult.reply ?? "Necesito tu confirmación para continuar."
        const confirmationToolCalls: ResolvedToolCall[] =
          layerResult.confirmation?.actions.map((action) => ({
            name: action.tool,
            input: {},
            ok: false,
            error: "awaiting_confirmation",
          })) ?? []

        await this.deps.conversations.saveMessage(ctx, conversation.id, {
          role: "assistant",
          content: reply,
          toolCalls: confirmationToolCalls,
          metadata: { intent: layerIntent, confirmationRequired: true },
        })

        await finalize(reply, confirmationToolCalls, false)

        return {
          conversationId: conversation.id,
          message: userMessage,
          response: {
            reply,
            provider: "intelligence",
            model: "confirmation",
            toolCalls: confirmationToolCalls,
            ok: true,
          },
          metadata: {
            status: "confirmation_required",
            intent: layerIntent,
            trace: layerTrace,
          },
          confirmation: layerResult.confirmation,
        }
      }

      if (layerResult.status === "completed") {
        intelligenceToolCalls = toResolvedToolCalls(layerResult.toolResults)

        if (layerResult.synthesizedContext) {
          // El LLM sintetiza la respuesta final a partir de la evidencia.
          request.intelligenceContext = layerResult.synthesizedContext
          request.metadata = { ...request.metadata, intelligence: true }
        } else if (layerResult.reply) {
          // Sin resultados aprovechables: respuesta determinista sin llamar al LLM.
          await this.deps.conversations.saveMessage(ctx, conversation.id, {
            role: "assistant",
            content: layerResult.reply,
            toolCalls: intelligenceToolCalls,
            metadata: { intent: layerIntent, provider: "intelligence", model: "deterministic" },
          })
          await finalize(layerResult.reply, intelligenceToolCalls, false)
          return {
            conversationId: conversation.id,
            message: userMessage,
            response: {
              reply: layerResult.reply,
              provider: "intelligence",
              model: "deterministic",
              toolCalls: intelligenceToolCalls,
              ok: true,
            },
            metadata: {
              status: "completed",
              intent: layerIntent,
              trace: layerTrace,
            },
          }
        }
      }
    }

    const response = await this.deps.agent.handle(request)

    const toolCalls = [...intelligenceToolCalls, ...response.toolCalls]

    // FASE 3D: extrae y guarda los hechos del turno (best-effort, nunca bloquea el chat).
    if (this.deps.memory) {
      const turn: MemoryTurn = {
        userId: ctx.userId,
        storeId: ctx.storeId,
        negocioId: ctx.negocioId ?? undefined,
        message: input.message,
        reply: response.reply,
        toolCalls,
      }
      void this.deps.memory
        .saveTurn(memoryCtx, turn)
        .catch((error: unknown) => console.error("[conversation] saveTurn falló", error))
    }

    await this.deps.conversations.saveMessage(ctx, conversation.id, {
      role: "assistant",
      content: response.reply,
      toolCalls,
      metadata: {
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        taskType: response.taskType,
      },
    })

    this.learnFromTurn(ctx, input.message, layerIntent, layerDomains)

    await finalize(response.reply, toolCalls, Boolean(input.confirmedStepIds?.length))

    return {
      conversationId: conversation.id,
      message: userMessage,
      response: {
        reply: response.reply,
        provider: response.provider,
        model: response.model,
        toolCalls,
        usage: response.usage,
        ok: response.ok,
        error: response.error,
      },
      metadata: {
        taskType: response.taskType,
        status: response.ok ? "completed" : "error",
        ...(layerIntent ? { intent: layerIntent } : {}),
        ...(layerTrace ? { trace: layerTrace } : {}),
      },
    }
  }
}
