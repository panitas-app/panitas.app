import Pusher from "pusher"

function createPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[pusher] PUSHER_APP_ID, PUSHER_KEY o PUSHER_SECRET no configurados — eventos de scanner deshabilitados")
    }
    return null
  }
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER || "us2",
    useTLS: true,
  })
}

const pusher = createPusher()

export function getPusherChannel(sessionId: string): string {
  return `scanner-${sessionId}`
}

export async function triggerSessionEvent(
  sessionId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!pusher) return
  try {
    await pusher.trigger(getPusherChannel(sessionId), event, data)
  } catch (e) {
    console.error(`[pusher] Error al enviar evento ${event}:`, e)
  }
}

export { pusher }
