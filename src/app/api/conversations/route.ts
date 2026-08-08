import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import { getPaginationParams, paginatedResponse } from "@/lib/pagination"
import { ConversationService } from "@/services/conversation.service"
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

export async function GET(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const { skip, take, page } = getPaginationParams(searchParams)
  const status = searchParams.get("status") ?? undefined
  // FASE 5C: búsqueda por título o contenido (p.ej. ?q=zapato).
  const query = searchParams.get("q") ?? undefined

  const result = query
    ? await conversationService.search(ctxFrom(current), query, { skip, take, status })
    : await conversationService.list(ctxFrom(current), { skip, take, status })

  return NextResponse.json(paginatedResponse(result.conversations, result.total, page, take))
}
