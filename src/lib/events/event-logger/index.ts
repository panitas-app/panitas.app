/**
 * Event Logger (FASE 5H).
 *
 * Abstracción mínima de logging del bus. En producción se usa el logger de
 * consola; en tests, `NoopEventLogger` para no ensuciar la salida.
 */
import type { EventLogEntry, EventLogger } from "../event-types"

export class ConsoleEventLogger implements EventLogger {
  constructor(private readonly enabled = true) {}

  log(entry: EventLogEntry): void {
    if (!this.enabled) return
    const tag = `[event:${entry.eventType ?? "bus"}]`
    const suffix = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : ""
    switch (entry.level) {
      case "error":
        console.error(tag, entry.message, suffix, entry.error ?? "")
        break
      case "warn":
        console.warn(tag, entry.message, suffix)
        break
      case "info":
        console.info(tag, entry.message, suffix)
        break
      default:
        if (process.env.NODE_ENV !== "production") {
          console.debug(tag, entry.message, suffix)
        }
    }
  }
}

export class NoopEventLogger implements EventLogger {
  log(): void {
    // no-op
  }
}

export function createEventLogger(options: { console?: boolean; noop?: boolean } = {}): EventLogger {
  if (options.noop) return new NoopEventLogger()
  return new ConsoleEventLogger(options.console !== false)
}
