/**
 * Detector de canales (FASE 8C).
 *
 * Reglas deterministas sobre conexiones reales de proveedores (WhatsApp,
 * Instagram, Messenger — FASE 8A/8B):
 *  - `disconnected`: canal desconectado (crítico: no se reciben pedidos).
 *  - `error`: canal con error (alto: hay que reautenticar/revisar).
 */
import type { Situation } from "../types"

export interface ChannelConnectionRow {
  id: string
  channelId: string
  channelName: string
  provider: string
  status: string
  errorMessage: string | null
}

export interface ChannelData {
  connections: ChannelConnectionRow[]
}

export function detectChannels(data: ChannelData): Situation[] {
  const situations: Situation[] = []

  for (const connection of data.connections) {
    const base = {
      entityType: "channel",
      entityId: connection.channelId,
      action: { label: "Revisar canal", href: `/dashboard/conversaciones?channel=${encodeURIComponent(connection.channelId)}` },
      metadata: {
        provider: connection.provider,
        channelName: connection.channelName,
        errorMessage: connection.errorMessage,
      },
    }

    if (connection.status === "disconnected") {
      situations.push({
        ...base,
        type: "channel.disconnected",
        priority: "critical",
        title: `Canal ${connection.channelName} desconectado`,
        description: `El canal ${connection.channelName} está desconectado y no recibe mensajes de clientes.`,
        recommendation: "Vuelve a conectar el canal para no perder pedidos ni consultas.",
      })
      continue
    }

    if (connection.status === "error") {
      situations.push({
        ...base,
        type: "channel.error",
        priority: "high",
        title: `Canal ${connection.channelName} con error`,
        description: connection.errorMessage
          ? `El canal ${connection.channelName} reportó un error: ${connection.errorMessage}`
          : `El canal ${connection.channelName} está en estado de error.`,
        recommendation: "Revisa la configuración del canal y vuelve a conectarlo.",
      })
    }
  }

  return situations
}
