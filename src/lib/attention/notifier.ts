/**
 * Canales externos de notificación (FASE 8C).
 *
 * Arquitectura PREPARADA, sin envíos automáticos en v1. Define la interfaz de
 * un canal externo (email, WhatsApp, push, webhook) y un filtro que respeta
 * preferencias y horario de silencio. Por defecto no hay canales conectados:
 * todo es noop hasta que un canal real se inyecte.
 */
import { isAtLeastPriority, type AttentionAction, type AttentionPriority, type AttentionType } from "./types"
import type { AttentionPreferences } from "./preferences"

export interface AttentionNotification {
  storeId: string
  itemId: string
  type: AttentionType
  priority: AttentionPriority
  title: string
  description: string
  action?: AttentionAction
}

/** Canal externo real (email, WhatsApp, push...). Se inyecta en producción. */
export interface ExternalAttentionChannel {
  name: string
  send(notification: AttentionNotification): void | Promise<void>
}

export class NoopExternalAttentionChannel implements ExternalAttentionChannel {
  name = "noop"
  async send(): Promise<void> {
    // no-op: canal futuro no conectado (FASE 8C, sin envíos automáticos).
  }
}

export interface AttentionNotifier {
  /** Devuelve true si al menos un canal envió la notificación. */
  notify(notification: AttentionNotification, context?: { quietHours?: boolean }): Promise<boolean>
}

/** Notificador que aplica prioridad mínima y horario de silencio. */
export class FilteredAttentionNotifier implements AttentionNotifier {
  constructor(
    private readonly channels: ExternalAttentionChannel[],
    private readonly options: { minPriority?: AttentionPriority } = {},
  ) {}

  async notify(notification: AttentionNotification, context: { quietHours?: boolean } = {}): Promise<boolean> {
    const minPriority = this.options.minPriority ?? "high"
    if (!isAtLeastPriority(notification.priority, minPriority)) return false
    if (context.quietHours) return false

    let sent = 0
    for (const channel of this.channels) {
      try {
        await channel.send(notification)
        sent += 1
      } catch (error) {
        console.error(
          `[attention] envío por ${channel.name} falló:`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
    return sent > 0
  }
}

/** ¿`now` está dentro del horario de silencio del negocio? */
export function isWithinQuietHours(prefs: Pick<AttentionPreferences, "quietHoursStart" | "quietHoursEnd">, now: Date): boolean {
  const start = prefs.quietHoursStart
  const end = prefs.quietHoursEnd
  if (!start || !end) return false

  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)
  if (startMinutes == null || endMinutes == null) return false

  const current = now.getHours() * 60 + now.getMinutes()
  // Ventana que cruza medianoche (ej. 22:00 → 08:00) o ventana del mismo día.
  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) return current >= startMinutes && current < endMinutes
  return current >= startMinutes || current < endMinutes
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}
