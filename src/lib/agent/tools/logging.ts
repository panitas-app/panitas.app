/**
 * Tool Logging (FASE 3B).
 *
 * Registra cada invocación en la auditoría FASE 1C (`agentAudit`) con eventos:
 *   - `tool.called`  → al iniciar la ejecución
 *   - `tool.success` → cuando la tool devuelve success:true
 *   - `tool.failed`  → cuando la tool falla o el usuario no tiene permisos
 *
 * Almacena: usuario, negocio (storeId), tool, acción, input y resultado. Best-effort:
 * un fallo de auditoría nunca rompe la ejecución de la tool.
 */
import { agentAudit } from "@/lib/agent/audit"

export type ToolLogEvent = "tool.called" | "tool.success" | "tool.failed"

export interface ToolLogEntry {
  event: ToolLogEvent
  userId: string
  storeId: string
  negocioId?: string | null
  tool: string
  input?: Record<string, unknown>
  result?: "success" | "error"
  error?: string | null
  durationMs?: number
}

export interface ToolLogger {
  log(entry: ToolLogEntry): void
}

export class AuditToolLogger implements ToolLogger {
  constructor(private readonly audit = agentAudit) {}

  log(entry: ToolLogEntry): void {
    try {
      this.audit.record({
        userId: entry.userId,
        storeId: entry.storeId,
        tool: entry.tool,
        action: entry.event,
        input: entry.input,
        result: entry.result ?? (entry.event === "tool.success" ? "success" : "error"),
        error: entry.error ?? null,
      })
    } catch {
      // Auditoría best-effort
    }
  }
}

export class NoopToolLogger implements ToolLogger {
  log(): void {
    // no-op
  }
}
