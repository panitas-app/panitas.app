import Pusher from "pusher-js"

export interface ScannerSessionInfo {
  id: string
  createdAt: string
  expiresAt: string
  status: "connected" | "disconnected" | "expired" | "error"
  deviceName: string
}

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || ""
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2"

export const SessionManager = {
  /**
   * Valida la sesión y token mediante POST a /api/scanner/connect
   */
  async validate(
    sessionId: string,
    token: string,
    deviceName: string
  ): Promise<{ success: boolean; session?: ScannerSessionInfo; error?: string }> {
    try {
      const res = await fetch("/api/scanner/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, token, deviceName }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 410) {
          return { success: false, error: data.error || "Sesión expirada" }
        }
        return { success: false, error: data.error || "Error al conectar con el POS" }
      }

      return { success: true, session: data.session }
    } catch (e: any) {
      return { success: false, error: e?.message || "Error de red al validar sesión" }
    }
  },

  /**
   * Suscribe a los eventos de Pusher
   */
  subscribePusher(
    sessionId: string,
    callbacks: {
      onProductFound: (barcode: string, productName?: string) => void
      onProductNotFound: (barcode: string) => void
      onDisconnect: () => void
    }
  ): () => void {
    if (!PUSHER_KEY) {
      console.warn("[SessionManager] PUSHER_KEY no configurada. Eventos en tiempo real deshabilitados.")
      return () => {}
    }

    try {
      const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
      const channelName = `scanner-${sessionId}`
      const channel = pusher.subscribe(channelName)

      channel.bind("product_found", (data: any) => {
        callbacks.onProductFound(data.barcode, data.product?.name)
      })

      channel.bind("product_not_found", (data: any) => {
        callbacks.onProductNotFound(data.barcode)
      })

      channel.bind("scanner_disconnect", () => {
        callbacks.onDisconnect()
      })

      return () => {
        const ch = pusher.channel(channelName)
        if (ch) {
          ch.unbind_all()
          ch.unsubscribe()
        }
        pusher.disconnect()
      }
    } catch (e: any) {
      console.error("[SessionManager] Error al suscribir a Pusher:", e)
      return () => {}
    }
  },

  /**
   * Envía un código escaneado al servidor
   */
  async sendBarcode(
    sessionId: string,
    barcode: string
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, barcode }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { success: false, error: data.error || "Error al enviar código", status: res.status }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || "Error de red al enviar código" }
    }
  },
}
