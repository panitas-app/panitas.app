import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/permissions"
import { attentionService } from "@/lib/attention/app"
import { syncIfStale } from "@/lib/attention/engine"
import { isAttentionType, isAtLeastPriority, type AttentionItemDTO, type AttentionPriority, type AttentionStatus } from "@/lib/attention"

const ALLOWED_ROLES = ["admin", "manager", "seller", "viewer"] as const
const WRITE_ROLES = ["admin", "manager"] as const

/**
 * Centro de Atención (FASE 8C).
 *
 * GET  /api/attention?status=open&type=...&search=...&grouped=true
 *   Lista los AttentionItems de la tienda (o agrupados por tipo). Antes de
 *   responder, re-sincroniza si la tienda no se sincronizó recientemente.
 *
 * PATCH /api/attention  { action, itemId, snoozeUntil? }
 *   Acciones de estado: acknowledge | resolve | dismiss | snooze.
 */
export async function GET(req: NextRequest) {
  try {
    const current = await requireRole([...ALLOWED_ROLES])
    const storeId = current.store.id

    const { searchParams } = new URL(req.url)
    const status = parseStatus(searchParams.get("status"))
    const type = parseType(searchParams.get("type"))
    const priority = parsePriority(searchParams.get("priority"))
    const search = searchParams.get("search") ?? undefined
    const grouped = searchParams.get("grouped") === "true"
    const limit = parseLimit(searchParams.get("limit"))

    // Mantener el centro de atención fresco (throttled por tienda).
    await syncIfStale(attentionService, storeId)

    const query = { status, type, priority, search, limit }

    if (grouped) {
      const groups = await attentionService.group(storeId, query)
      const overview = await attentionService.overview(storeId)
      return NextResponse.json({ groups, overview })
    }

    const items = await attentionService.list(storeId, query)
    const overview = await attentionService.overview(storeId)
    return NextResponse.json({ items, overview })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const current = await requireRole([...WRITE_ROLES])
    const storeId = current.store.id
    const actorId = current.userId

    const body = (await req.json()) as { action?: string; itemId?: string; snoozeUntil?: string }
    const { action, itemId } = body
    if (!action || !itemId) {
      return NextResponse.json({ error: "Faltan action o itemId" }, { status: 400 })
    }

    let result: AttentionItemDTO | null = null

    switch (action) {
      case "acknowledge":
        result = await attentionService.acknowledge(storeId, itemId, actorId)
        break
      case "resolve":
        result = await attentionService.resolve(storeId, itemId, actorId)
        break
      case "dismiss":
        result = await attentionService.dismiss(storeId, itemId, actorId)
        break
      case "snooze": {
        const until = body.snoozeUntil ? new Date(body.snoozeUntil) : null
        if (!until || Number.isNaN(until.getTime())) {
          return NextResponse.json({ error: "snoozeUntil inválido" }, { status: 400 })
        }
        result = await attentionService.snooze(storeId, itemId, until, actorId)
        break
      }
      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 })
    }

    if (!result) {
      return NextResponse.json({ error: "Item no encontrado o sin permiso" }, { status: 404 })
    }
    return NextResponse.json({ item: result })
  } catch (error) {
    return errorResponse(error)
  }
}

function parseStatus(raw: string | null): AttentionStatus | "open" | undefined {
  if (!raw) return undefined
  if (raw === "open" || raw === "active" || raw === "new" || raw === "acknowledged" || raw === "snoozed" || raw === "resolved" || raw === "dismissed") {
    return raw as AttentionStatus | "open"
  }
  return undefined
}

function parseType(raw: string | null) {
  return raw && isAttentionType(raw) ? raw : undefined
}

function parsePriority(raw: string | null): AttentionPriority | undefined {
  return raw && isAtLeastPriority(raw as AttentionPriority, "low") ? (raw as AttentionPriority) : undefined
}

function parseLimit(raw: string | null): number | undefined {
  const value = raw ? Number(raw) : undefined
  if (!value || Number.isNaN(value) || value <= 0) return undefined
  return Math.min(value, 500)
}

function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : String(error)
  const unauthorized = /permisos|acceso/i.test(message)
  return NextResponse.json({ error: message }, { status: unauthorized ? 403 : 500 })
}
