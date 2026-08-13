/**
 * Platform (FASE 8D) — recurso conversations (Inbox unificado, FASE 7A).
 * Solo lectura. Los mensajes salientes se gestionan por el propio centro de conversaciones.
 */
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApiError } from "@/lib/platform/errors"
import { paginate, parseLimit, parseSort } from "@/lib/platform/public-api/pagination"
import { ok } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"
import { safeId } from "./helpers"

const CONVERSATION_SORT_WHITELIST = ["lastMessageAt", "createdAt", "updatedAt"] as const
const CONVERSATION_STATUSES = ["nueva", "pendiente", "en_atencion", "resuelta", "archivada"]

const CONVERSATION_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  unreadCount: true,
  isPinned: true,
  customerId: true,
  assignedToId: true,
  lastMessageAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function listConversations(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get("limit"))
  const sort = parseSort(searchParams.get("sort"), CONVERSATION_SORT_WHITELIST)
  const status = searchParams.get("status")
  const channelId = searchParams.get("channelId")
  const search = (searchParams.get("search") ?? "").slice(0, 100)

  if (status && !CONVERSATION_STATUSES.includes(status)) {
    throw new ApiError("INVALID_REQUEST", `status inválido. Permitidos: ${CONVERSATION_STATUSES.join(", ")}`, 422)
  }

  const { items, pagination } = await paginate({ limit, cursor: searchParams.get("cursor") }, ({ skip, take }) => {
    return prisma.inboxConversation.findMany({
      where: {
        storeId: ctx.storeId,
        ...(status ? { status } : {}),
        ...(channelId ? { channelId: safeId(channelId) } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
                { customer: { phone: { contains: search } } },
              ],
            }
          : {}),
      },
      select: CONVERSATION_SELECT,
      orderBy: sort ? { [sort.field]: sort.direction } : { lastMessageAt: "desc" },
      skip,
      take,
    })
  })

  return ok(items, { pagination, requestId: ctx.requestId })
}

export async function getConversation(ctx: PublicApiContext, _request: NextRequest, params: Record<string, string>) {
  const id = safeId(params.id)
  const conversation = await prisma.inboxConversation.findFirst({
    where: { id, storeId: ctx.storeId },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      messages: {
        select: { id: true, sender: true, senderName: true, content: true, channel: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      notes: { select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  })
  if (!conversation) throw new ApiError("RESOURCE_NOT_FOUND", "Conversación no encontrada", 404)
  return ok(conversation, { requestId: ctx.requestId })
}
