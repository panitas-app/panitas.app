/**
 * Platform (FASE 8D) — recurso events.
 * Expone el catálogo de Business Events que un cliente puede suscribir vía webhooks.
 * No almacenamos historial: los eventos en tiempo real llegan por el sistema de webhooks.
 */
import type { NextRequest } from "next/server"
import { EVENT_META, EVENT_CATEGORIES } from "@/lib/events/event-registry"
import { ApiError } from "@/lib/platform/errors"
import { ok } from "@/lib/platform/public-api/response"
import type { PublicApiContext } from "@/lib/platform/public-api/context"

export async function listEventCatalog(ctx: PublicApiContext, request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  if (category) {
    const valid = EVENT_CATEGORIES.some((c) => c === category)
    if (!valid) {
      throw new ApiError("INVALID_REQUEST", "categoría inválida", 422)
    }
  }

  const entries = Object.entries(EVENT_META)
    .filter(([, meta]) => (category ? meta.category === category : true))
    .map(([type, meta]) => ({ type, category: meta.category, description: meta.description }))

  return ok(entries, { requestId: ctx.requestId })
}
