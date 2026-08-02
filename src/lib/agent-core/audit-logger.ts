/**
 * Audit Logger del Agent Core (FASE 3A).
 *
 * Registra cada interacción del asistente en la infraestructura de auditoría FASE 1C
 * (`agentAudit`). Inyectable: los tests pueden usar `NoopAuditLogger`.
 */
import { agentAudit } from "@/lib/agent/audit"
import type { AgentTaskType } from "./types"

export interface AuditLogEntry {
  userId: string
  storeId: string
  sessionId: string
  taskType: AgentTaskType
  toolNames: string[]
  ok: boolean
  error?: string
  durationMs: number
}

export interface AuditLogger {
  record(entry: AuditLogEntry): void
}

export class NoopAuditLogger implements AuditLogger {
  record(): void {
    // no-op
  }
}

export class AgentAuditLogger implements AuditLogger {
  constructor(private readonly enabled = true) {}

  record(entry: AuditLogEntry): void {
    if (!this.enabled) return
    try {
      agentAudit.record({
        userId: entry.userId,
        storeId: entry.storeId,
        tool: `agent.${entry.taskType}`,
        action: "agent.request",
        input: { sessionId: entry.sessionId, tools: entry.toolNames, durationMs: entry.durationMs },
        result: entry.ok ? "success" : "error",
        error: entry.error ?? null,
      })
    } catch {
      // Auditoría es best-effort; nunca rompe la respuesta del agente.
    }
  }
}
