import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { requireFeature } from "@/lib/features"
import { csrfGuard } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { createConversationEngine } from "@/lib/conversation"
import { toClientChatView, humanizeError } from "@/lib/conversational"
import type { StoreServiceContext } from "@/services/context"
import { createAuditEntry } from "@/lib/audit"

let engine: ReturnType<typeof createConversationEngine> | null = null

function getEngine() {
  if (!engine) engine = createConversationEngine()
  return engine
}

function ctxFrom(current: Awaited<ReturnType<typeof requireRole>>): StoreServiceContext {
  return {
    storeId: current.store.id,
    userId: current.userId,
    negocioId: current.store.negocioId ?? undefined,
    role: current.role,
    plan: current.store.plan,
    storeName: current.store.name,
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const rl = await rateLimit("agent-chat", 30, 60 * 1000)
  if (!rl.success) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(rl.resetIn / 1000)}s` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    )
  }

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])

    const gate = requireFeature(current.store.plan, "basic_ai")
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const body = await request.json()
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined
    // FASE 4C: segunda vuelta de confirmación — IDs de pasos aprobados por el usuario.
    const confirmedStepIds = Array.isArray(body?.confirmedStepIds)
      ? body.confirmedStepIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : undefined

    if (!message) {
      return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 })
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "El mensaje es demasiado largo (máximo 4000 caracteres)" }, { status: 400 })
    }
    if (confirmedStepIds && confirmedStepIds.length > 10) {
      return NextResponse.json({ error: "Demasiadas confirmaciones en la solicitud" }, { status: 400 })
    }

    const ctx = ctxFrom(current)
    const result = await getEngine().chat(ctx, { conversationId, message, confirmedStepIds })

    createAuditEntry({
      action: result.response.ok ? "agent.completed" : "agent.failed",
      entity: "Conversation",
      entityId: result.conversationId,
      metadata: {
        provider: result.response.provider,
        model: result.response.model,
        toolCalls: result.response.toolCalls.map((t) => t.name),
        status: result.metadata.status,
      },
      userId: ctx.userId,
      storeId: ctx.storeId,
    }).catch(() => undefined)

    return NextResponse.json(toClientChatView(result))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    const isPlanError = message.includes("No tienes") || message.includes("Tu plan")
    const human = humanizeError(error)
    return NextResponse.json({ error: human }, { status: isPlanError ? 403 : 500 })
  }
}
