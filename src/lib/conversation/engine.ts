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
import type { StepExecutionResult } from "@/lib/agent-intel/types"
import { buildConversationalHistory } from "./context-builder"
import type { StoreServiceContext } from "@/services/context"
import type { BusinessContextBuilder } from "@/lib/agent/context"
import type { MemoryManager, MemoryTurn } from "@/lib/agent/memory"

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

  async chat(ctx: StoreServiceContext, input: ChatTurnInput): Promise<ChatTurnResult> {
    const conversation = await this.deps.conversations.ensureConversation(ctx, input.conversationId)

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

    const request: AgentRequest = {
      userId: ctx.userId,
      storeId: ctx.storeId,
      negocioId: ctx.negocioId ?? null,
      plan: ctx.plan ?? "business",
      role: ctx.role ?? "admin",
      permissions: permissionsForRole(ctx.role ?? "admin"),
      message: input.message,
      sessionId: conversation.id,
      history: limitedHistory,
      taskType: "chat",
      businessContext,
      memoryContext,
      metadata: {
        businessName: ctx.storeName,
        conversationId: conversation.id,
      },
    }

    // FASE 4A — Intelligence Layer: intención → plan → confirmación o ejecución → síntesis.
    let intelligenceToolCalls: ResolvedToolCall[] = []
    let layerIntent: string | undefined
    let layerTrace: unknown

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
      layerTrace = layerResult.trace

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
