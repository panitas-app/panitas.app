import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore, requireRole } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { ConversationService } from "@/services/conversation.service"
import { toServiceResponse } from "@/services/http"
import type { StoreServiceContext } from "@/services/context"

const conversationService = new ConversationService()

function ctxFrom(current: Awaited<ReturnType<typeof getCurrentStore>>): StoreServiceContext {
  return {
    storeId: current!.store.id,
    userId: current!.userId,
    negocioId: current!.store.negocioId ?? undefined,
    role: current!.role,
    plan: current!.store.plan,
    storeName: current!.store.name,
  }
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: RouteContext) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await ctx.params
    const history = await conversationService.getHistory(ctxFrom(current), id)
    return NextResponse.json(history)
  } catch (error: unknown) {
    return toServiceResponse(error)
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const { id } = await ctx.params

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    if (!title) {
      return NextResponse.json({ error: "El título no puede estar vacío" }, { status: 400 })
    }
    if (title.length > 60) {
      return NextResponse.json({ error: "El título es demasiado largo (máximo 60 caracteres)" }, { status: 400 })
    }

    const conversation = await conversationService.rename(ctxFrom(current), id, title)
    return NextResponse.json(conversation)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  try {
    const current = await requireRole(["admin", "manager", "seller", "viewer"])
    const { id } = await ctx.params
    const result = await conversationService.deleteConversation(ctxFrom(current), id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message.includes("No tienes") || message.includes("Tu plan")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return toServiceResponse(error)
  }
}
