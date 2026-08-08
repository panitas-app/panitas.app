/**
 * WhatsApp Cloud API (FASE 8A) — Gestión de la conexión del negocio.
 *
 * `GET`  — estado de la conexión de WhatsApp (nunca secrets).
 * `POST` — acciones: `connect` (guardar credenciales), `disconnect`,
 *          `revoke` (borra credenciales), `health` (salud real contra Graph API).
 *
 * Acceso: requiere sesión + `unified_chat` (base del inbox) y la feature
 * `whatsapp_inbox` (Panitas Negocios Plus).
 */
import { NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf"
import { tryHasFeature } from "@/lib/features"
import {
  ChannelConnectionService,
  getCommunicationService,
  invalidateCommunicationService,
  type WhatsAppConnectionInput,
} from "@/lib/whatsapp"
import { requireInboxStore, inboxErrorResponse, type StoreInfo } from "../../_helpers"

const connections = new ChannelConnectionService()

function planGate(current: StoreInfo): NextResponse | null {
  const access = tryHasFeature(
    { plan: current.store.plan, planType: current.store.planType },
    "whatsapp_inbox",
  )
  if (!access.allowed) {
    return NextResponse.json(
      { error: "WhatsApp es una función de Panitas Negocios Plus" },
      { status: 403 },
    )
  }
  return null
}

export async function GET() {
  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const gated = planGate(current.store)
  if (gated) return gated

  try {
    const connection = await connections.get(current.ctx)
    if (!connection) {
      return NextResponse.json({ configured: false, status: "unconfigured" })
    }
    return NextResponse.json({ connection: connections.toDTO(connection) })
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al consultar la conexión de WhatsApp")
  }
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const current = await requireInboxStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const gated = planGate(current.store)
  if (gated) return gated

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
        const phoneNumberId = typeof body.phoneNumberId === "string" ? body.phoneNumberId.trim() : ""
        if (!accessToken || !phoneNumberId) {
          return NextResponse.json(
            { error: "accessToken y phoneNumberId son obligatorios" },
            { status: 400 },
          )
        }
        const input: WhatsAppConnectionInput = {
          accessToken,
          phoneNumberId,
          wabaId: typeof body.wabaId === "string" ? body.wabaId.trim() : undefined,
          verifyToken: typeof body.verifyToken === "string" ? body.verifyToken.trim() : undefined,
          appSecret: typeof body.appSecret === "string" ? body.appSecret.trim() : undefined,
          displayPhoneNumber: typeof body.displayPhoneNumber === "string" ? body.displayPhoneNumber.trim() : undefined,
        }
        const dto = await connections.connect(current.ctx, input)
        invalidateCommunicationService(current.ctx.storeId)
        return NextResponse.json({ connection: dto }, { status: 200 })
      }
      case "disconnect": {
        const dto = await connections.disconnect(current.ctx)
        invalidateCommunicationService(current.ctx.storeId)
        return NextResponse.json({ connection: dto })
      }
      case "revoke": {
        const dto = await connections.revoke(current.ctx)
        invalidateCommunicationService(current.ctx.storeId)
        return NextResponse.json({ connection: dto })
      }
      case "health": {
        const service = await getCommunicationService(current.ctx.storeId)
        const [waHealth] = (await service.health()).filter((h) => h.channel === "whatsapp")
        if (waHealth) {
          await connections.updateHealth(current.ctx, waHealth.connected, waHealth.error)
        }
        const connection = await connections.get(current.ctx)
        return NextResponse.json({
          health: waHealth ?? null,
          connection: connection ? connections.toDTO(connection) : null,
        })
      }
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }
  } catch (error: unknown) {
    return inboxErrorResponse(error, "Error al gestionar la conexión de WhatsApp")
  }
}
