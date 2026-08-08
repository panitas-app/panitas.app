/**
 * Instagram + Messenger (FASE 8B) — Gestión de la conexión del negocio.
 *
 * `GET`  — estado de la conexión del canal (nunca secrets).
 * `POST` — acciones: `connect` (guardar credenciales), `disconnect`,
 *          `revoke` (borra credenciales), `health` (salud real contra Graph API).
 *
 * Acceso: requiere sesión + `unified_chat` (base del inbox) y la feature
 * `instagram_inbox` / `facebook_inbox` (Panitas Negocios Plus).
 */
import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { tryHasFeature } from "@/lib/features"
import type { InboxContext } from "@/lib/inbox"
import type { StoreInfo } from "@/app/api/inbox/_helpers"
import { inboxErrorResponse } from "@/app/api/inbox/_helpers"
import { MetaConnectionService } from "./connection-service"
import { getMetaCommunicationService, invalidateMetaCommunicationService } from "./communication-service"
import type { MetaConnectionInput } from "./connection-service"
import type { MetaChannel } from "./config"

const connections = new MetaConnectionService()

const CHANNEL_LABEL: Record<MetaChannel, string> = {
  instagram: "Instagram",
  messenger: "Messenger",
}

const CHANNEL_FEATURE: Record<MetaChannel, "instagram_inbox" | "facebook_inbox"> = {
  instagram: "instagram_inbox",
  messenger: "facebook_inbox",
}

export function metaChannelGate(current: StoreInfo, channel: MetaChannel): NextResponse | null {
  const access = tryHasFeature(
    { plan: current.store.plan, planType: current.store.planType },
    CHANNEL_FEATURE[channel],
  )
  if (!access.allowed) {
    return NextResponse.json(
      { error: `${CHANNEL_LABEL[channel]} es una función de Panitas Negocios Plus` },
      { status: 403 },
    )
  }
  return null
}

export async function metaChannelGet(current: { ctx: InboxContext }, channel: MetaChannel) {
  try {
    const connection = await connections.get(current.ctx, channel)
    if (!connection) {
      return NextResponse.json({ configured: false, status: "unconfigured" })
    }
    return NextResponse.json({ connection: connections.toDTO(connection) })
  } catch (error: unknown) {
    return inboxErrorResponse(error, `Error al consultar la conexión de ${CHANNEL_LABEL[channel]}`)
  }
}

export async function metaChannelPost(
  request: NextRequest,
  current: { ctx: InboxContext },
  channel: MetaChannel,
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const action = typeof body.action === "string" ? body.action : "connect"

  try {
    switch (action) {
      case "connect": {
        const accessToken = typeof body.accessToken === "string" ? body.accessToken.trim() : ""
        const accountId = typeof body.accountId === "string" ? body.accountId.trim() : ""
        if (!accessToken || !accountId) {
          return NextResponse.json(
            { error: "accessToken y accountId (page id / ig id) son obligatorios" },
            { status: 400 },
          )
        }
        const input: MetaConnectionInput = {
          accessToken,
          accountId,
          verifyToken: typeof body.verifyToken === "string" ? body.verifyToken.trim() : undefined,
          appSecret: typeof body.appSecret === "string" ? body.appSecret.trim() : undefined,
          username: typeof body.username === "string" ? body.username.trim() : undefined,
        }
        const dto = await connections.connect(current.ctx, channel, input)
        invalidateMetaCommunicationService(current.ctx.storeId, channel)
        return NextResponse.json({ connection: dto }, { status: 200 })
      }
      case "disconnect": {
        const dto = await connections.disconnect(current.ctx, channel)
        invalidateMetaCommunicationService(current.ctx.storeId, channel)
        return NextResponse.json({ connection: dto })
      }
      case "revoke": {
        const dto = await connections.revoke(current.ctx, channel)
        invalidateMetaCommunicationService(current.ctx.storeId, channel)
        return NextResponse.json({ connection: dto })
      }
      case "health": {
        const service = await getMetaCommunicationService(current.ctx.storeId, channel)
        const [health] = (await service.health()).filter((h) => h.channel === channel)
        if (health) {
          await connections.updateHealth(current.ctx, channel, health.connected, health.error)
        }
        const connection = await connections.get(current.ctx, channel)
        return NextResponse.json({
          health: health ?? null,
          connection: connection ? connections.toDTO(connection) : null,
        })
      }
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }
  } catch (error: unknown) {
    return inboxErrorResponse(error, `Error al gestionar la conexión de ${CHANNEL_LABEL[channel]}`)
  }
}
