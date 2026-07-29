import Pusher from "pusher"

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true,
})

export function getPusherChannel(sessionId: string): string {
  return `private-scanner-${sessionId}`
}

export async function triggerSessionEvent(
  sessionId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await pusher.trigger(getPusherChannel(sessionId), event, data)
}

export default pusher
