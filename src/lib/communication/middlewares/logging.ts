/**
 * Communication Integration Layer (FASE 7C) — Middleware de logging.
 *
 * Registra cada envío de salida (canal, destinatario, latencia y resultado)
 * sin exponer secretos ni contenido sensible completo.
 */
import type { ProviderSendResult } from "../provider-types"
import type { SendMiddleware } from "./middleware-types"

export interface LogEntry {
  level: "info" | "warn" | "error"
  message: string
  channel?: string
  providerId?: string
  conversationId?: string
  durationMs?: number
  status?: string
  error?: string
}

export type LogFn = (entry: LogEntry) => void

export const defaultLog: LogFn = (entry) => {
  console.log(`[communication] ${entry.level}: ${entry.message}`, entry)
}

export function loggingMiddleware(log: LogFn = defaultLog): SendMiddleware {
  return async (input, next) => {
    const startedAt = Date.now()
    try {
      const result: ProviderSendResult = await next()
      log({
        level: result.status === "failed" ? "warn" : "info",
        message: "mensaje enviado",
        channel: input.channel,
        providerId: result.providerId,
        conversationId: input.conversationId,
        durationMs: Date.now() - startedAt,
        status: result.status,
      })
      return result
    } catch (error: unknown) {
      log({
        level: "error",
        message: "fallo al enviar mensaje",
        channel: input.channel,
        conversationId: input.conversationId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}

/** Logger no operativo (para desactivar logging en tests/servicios). */
export const noopLog: LogFn = () => undefined
