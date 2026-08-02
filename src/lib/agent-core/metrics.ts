/**
 * Métricas del AI Provider Manager (FASE 3A).
 *
 * Registra por cada llamada: proveedor, modelo, tarea, latencia, reintentos,
 * estado y uso de tokens. Permite observar el sistema y proyectar costos futuros.
 */
import type { AgentTaskType, UsageInfo } from "./types"

export type LLMCallStatus = "success" | "error"

export interface LLMCallRecord {
  provider: string
  model: string
  taskType: AgentTaskType
  startedAt: number
  durationMs: number
  attempts: number
  status: LLMCallStatus
  error?: string
  usage?: UsageInfo
}

export interface ProviderMetricsSummary {
  total: number
  success: number
  errors: number
  avgDurationMs: number
  p95DurationMs: number
  byTask: Record<string, number>
  byProvider: Record<string, number>
  byModel: Record<string, number>
  errorsByProvider: Record<string, number>
}

export class ProviderMetrics {
  private records: LLMCallRecord[] = []

  record(call: LLMCallRecord): void {
    this.records.push(call)
  }

  snapshot(): LLMCallRecord[] {
    return [...this.records]
  }

  clear(): void {
    this.records = []
  }

  summary(): ProviderMetricsSummary {
    const byTask: Record<string, number> = {}
    const byProvider: Record<string, number> = {}
    const byModel: Record<string, number> = {}
    const errorsByProvider: Record<string, number> = {}
    const durations: number[] = []
    let success = 0
    let errors = 0

    for (const r of this.records) {
      byTask[r.taskType] = (byTask[r.taskType] ?? 0) + 1
      byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1
      byModel[r.model] = (byModel[r.model] ?? 0) + 1
      durations.push(r.durationMs)
      if (r.status === "success") {
        success++
      } else {
        errors++
        errorsByProvider[r.provider] = (errorsByProvider[r.provider] ?? 0) + 1
      }
    }

    const total = this.records.length
    const avgDurationMs = total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0
    const p95DurationMs = total > 0 ? percentile(durations, 0.95) : 0

    return { total, success, errors, avgDurationMs, p95DurationMs, byTask, byProvider, byModel, errorsByProvider }
  }
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(sorted.length * p) - 1)
  return sorted[Math.min(index, sorted.length - 1)]
}
