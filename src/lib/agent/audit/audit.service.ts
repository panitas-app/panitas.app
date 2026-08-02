import { createAuditEntry } from "@/lib/audit"

export type AgentAuditResult = "success" | "error"

export type AgentAuditRecord = {
  id: string
  userId: string
  userName?: string | null
  storeId?: string | null
  tool: string
  action: string
  input?: Record<string, unknown>
  result: AgentAuditResult
  error?: string | null
  timestamp: Date
}

export type AgentAuditRecordInput = Omit<AgentAuditRecord, "id" | "timestamp">

export interface AgentAuditStore {
  record(entry: AgentAuditRecord): void
  list(): AgentAuditRecord[]
  clear(): void
}

const MAX_RECORDS = 500

export class InMemoryAgentAuditStore implements AgentAuditStore {
  private readonly records: AgentAuditRecord[] = []

  record(entry: AgentAuditRecord): void {
    this.records.push(entry)
    if (this.records.length > MAX_RECORDS) {
      this.records.splice(0, this.records.length - MAX_RECORDS)
    }
  }

  list(): AgentAuditRecord[] {
    return [...this.records]
  }

  clear(): void {
    this.records.length = 0
  }
}

export class AgentAuditService {
  private persistEnabled = false

  constructor(private readonly store: AgentAuditStore = new InMemoryAgentAuditStore()) {}

  enablePersistence(): void {
    this.persistEnabled = true
  }

  record(input: AgentAuditRecordInput): AgentAuditRecord {
    const entry: AgentAuditRecord = {
      ...input,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    }
    this.store.record(entry)

    if (this.persistEnabled) {
      createAuditEntry({
        action: `agent.tool.${entry.tool}`,
        entity: "AgentTool",
        entityId: entry.tool,
        metadata: { result: entry.result, error: entry.error ?? null, action: entry.action },
        userId: entry.userId,
        storeId: entry.storeId || undefined,
      }).catch(() => {
        // La persistencia a AuditLog es best-effort; la trazabilidad en memoria sigue disponible.
      })
    }

    return entry
  }

  list(): AgentAuditRecord[] {
    return this.store.list()
  }

  clear(): void {
    this.store.clear()
  }
}

export const agentAudit = new AgentAuditService()
