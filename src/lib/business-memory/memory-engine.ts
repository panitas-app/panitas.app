/**
 * Business Memory Engine (FASE 5G) — fachada única de la memoria estable.
 *
 * Expone todo lo que el asistente y el panel necesitan:
 *
 *   - recuperar memoria relevante por intención antes de responder
 *   - aprender de los turnos (explícito + repetición con umbral)
 *   - administrar recuerdos (listar, actualizar, eliminar, resetear)
 *   - activar/desactivar el aprendizaje automático por negocio
 *
 * El engine es un DTO ligero que cablea store + learner + querier. En pruebas
 * se inyecta un store en memoria; en producción el store Prisma.
 */
import type {
  BusinessMemoryItem,
  BusinessMemoryListOptions,
  BusinessMemoryObservation,
  BusinessMemoryStore,
  IntentQuery,
  IntentQueryResult,
  LearningConfig,
  MemoryStats,
} from "./memory-types"
import type { MemoryContext } from "@/lib/agent/memory"
import { BusinessMemoryLearner, type MemoryTurnSignal } from "./memory-learning"
import { BusinessMemoryQuerier } from "./memory-query"
import { SETTINGS_LEARNING_KEY } from "./memory-learning"

export interface BusinessMemoryEngineOptions {
  store: BusinessMemoryStore
  config?: Partial<LearningConfig>
}

export class BusinessMemoryEngine {
  readonly learner: BusinessMemoryLearner
  readonly querier: BusinessMemoryQuerier
  private readonly store: BusinessMemoryStore

  constructor(options: BusinessMemoryEngineOptions) {
    this.store = options.store
    this.learner = new BusinessMemoryLearner(options.store, options.config)
    this.querier = new BusinessMemoryQuerier(options.store)
  }

  /** Recuerdos relevantes para la consulta (SIN enviar toda la memoria). */
  queryForIntent(ctx: MemoryContext, query: IntentQuery): Promise<IntentQueryResult> {
    return this.querier.queryForIntent(ctx, query)
  }

  /** Aprende de un turno de chat (best-effort, nunca bloquea el turno). */
  learnFromTurn(ctx: MemoryContext, turn: MemoryTurnSignal): Promise<number> {
    return this.learner.learnFromTurn(ctx, turn)
  }

  /** Observa un evento puntual de aprendizaje. */
  observe(ctx: MemoryContext, observation: BusinessMemoryObservation): Promise<BusinessMemoryItem | null> {
    return this.learner.observe(ctx, observation)
  }

  list(ctx: MemoryContext, opts?: BusinessMemoryListOptions): Promise<BusinessMemoryItem[]> {
    return this.store.list(ctx, opts)
  }

  get(ctx: MemoryContext, key: string): Promise<BusinessMemoryItem | null> {
    return this.store.get(ctx, key)
  }

  /** Actualiza label/valor/importancia de un recuerdo existente. */
  async update(
    ctx: MemoryContext,
    key: string,
    patch: { label?: string; value?: unknown; importance?: BusinessMemoryItem["importance"] },
  ): Promise<BusinessMemoryItem | null> {
    const existing = await this.store.get(ctx, key)
    if (!existing) return null
    const now = new Date().toISOString()
    const updated: BusinessMemoryItem = {
      ...existing,
      label: patch.label ?? existing.label,
      value: patch.value ?? existing.value,
      importance: patch.importance ?? existing.importance,
      updatedAt: now,
    }
    return this.store.put(ctx, updated)
  }

  remove(ctx: MemoryContext, key: string): Promise<boolean> {
    return this.store.remove(ctx, key)
  }

  /** Restablece la memoria del negocio conservando la configuración de aprendizaje. */
  reset(ctx: MemoryContext): Promise<number> {
    return this.store.removeAll(ctx, { excludeKeys: [SETTINGS_LEARNING_KEY] })
  }

  setLearningEnabled(ctx: MemoryContext, enabled: boolean): Promise<void> {
    return this.learner.setLearningEnabled(ctx, enabled)
  }

  isLearningEnabled(ctx: MemoryContext): Promise<boolean> {
    return this.learner.isLearningEnabled(ctx)
  }

  /** Estadísticas para el panel de gestión. */
  async stats(ctx: MemoryContext): Promise<MemoryStats> {
    const all = await this.store.list(ctx, { includeExpired: true })
    const stats: MemoryStats = {
      total: all.length,
      confirmed: all.filter((i) => i.status === "confirmed").length,
      candidates: all.filter((i) => i.status === "candidate").length,
      byKind: { terminology: 0, preference: 0, operational_rule: 0, usage_pattern: 0 },
    }
    for (const item of all) stats.byKind[item.kind] += 1
    return stats
  }
}
