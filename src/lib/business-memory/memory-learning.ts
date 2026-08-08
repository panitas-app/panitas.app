/**
 * Aprendizaje automático de la memoria estable del negocio (FASE 5G).
 *
 * El learner NUNCA consolida una preferencia con una sola acción:
 *
 *   - Observaciones explícitas (el usuario enseña "llamo clientes a los
 *     pacientes") se confirman de inmediato.
 *   - Observaciones implícitas (consultas repetidas de un mismo dominio)
 *     acumulan fuerza (`strength`) hasta cruzar el umbral configurado por tipo.
 *     Mientras tanto quedan como CANDIDATOS con TTL (7 días por defecto).
 *
 * El aprendizaje se puede desactivar por negocio (se persiste como un recuerdo
 * de tipo preferencia que sobrevive al reset).
 */
import type {
  BusinessMemoryItem,
  BusinessMemoryObservation,
  BusinessMemoryStore,
  LearningConfig,
} from "./memory-types"
import type { MemoryContext } from "@/lib/agent/memory"
import { DEFAULT_LEARNING_CONFIG, extractSignals, toObservation } from "./memory-rules"
import { SETTINGS_LEARNING_ENABLED_KEY } from "./memory-store"

export const SETTINGS_LEARNING_KEY = SETTINGS_LEARNING_ENABLED_KEY

export interface MemoryTurnSignal {
  message: string
  intent?: string
  /** Dominios detectados por la capa de inteligencia (4A): sales, inventory... */
  domains?: string[]
}

function id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `bm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function importanceFor(explicit: boolean | undefined, confirmed: boolean, importance?: BusinessMemoryItem["importance"]): BusinessMemoryItem["importance"] {
  if (importance) return importance
  if (explicit) return "HIGH"
  return confirmed ? "HIGH" : "LOW"
}

export class BusinessMemoryLearner {
  private readonly config: LearningConfig

  constructor(
    private readonly store: BusinessMemoryStore,
    config: Partial<LearningConfig> = {},
  ) {
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config }
  }

  /** Lee si el aprendizaje está activo (config persistida o valor por defecto). */
  async isLearningEnabled(ctx: MemoryContext): Promise<boolean> {
    const setting = await this.store.get(ctx, SETTINGS_LEARNING_KEY)
    if (setting && typeof setting.value === "boolean") return setting.value
    return this.config.enabled
  }

  /** Persiste la activación del aprendizaje automático para el negocio. */
  async setLearningEnabled(ctx: MemoryContext, enabled: boolean): Promise<void> {
    const now = new Date().toISOString()
    await this.store.put(ctx, {
      id: "",
      storeId: ctx.storeId,
      userId: ctx.userId,
      negocioId: ctx.negocioId ?? null,
      kind: "preference",
      importance: "CRITICAL",
      key: SETTINGS_LEARNING_KEY,
      label: enabled ? "Aprendizaje automático activado" : "Aprendizaje automático desactivado",
      value: enabled,
      metadata: { source: "explicit", status: "confirmed", strength: 1, threshold: 1, tags: ["ajustes", "settings"] },
      source: "explicit",
      status: "confirmed",
      expiresAt: null,
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  }

  /** Observa un evento y consolida o acumula el recuerdo correspondiente. */
  async observe(ctx: MemoryContext, observation: BusinessMemoryObservation): Promise<BusinessMemoryItem | null> {
    if (!(await this.isLearningEnabled(ctx))) return null

    const now = Date.now()
    const existing = await this.store.get(ctx, observation.key)
    const strength = (existing?.metadata.strength ?? 0) + (observation.strength ?? 1)
    const threshold = observation.explicit ? 1 : this.config.thresholds[observation.kind]
    const confirmed = strength >= threshold
    const base = existing ?? ({} as BusinessMemoryItem)

    const item: BusinessMemoryItem = {
      id: base.id || id(),
      storeId: ctx.storeId,
      userId: existing?.userId ?? ctx.userId,
      negocioId: existing?.negocioId ?? ctx.negocioId ?? null,
      kind: observation.kind,
      importance: importanceFor(observation.explicit, confirmed, observation.importance),
      key: observation.key,
      label: observation.label,
      value: observation.value,
      metadata: {
        source: observation.explicit ? "explicit" : existing?.metadata.source ?? "observation",
        status: confirmed ? "confirmed" : "candidate",
        strength,
        threshold,
        domain: observation.domain ?? existing?.metadata.domain,
        tags: observation.tags ?? existing?.metadata.tags ?? [],
      },
      source: observation.explicit ? "explicit" : (existing?.source ?? "observation"),
      status: confirmed ? "confirmed" : "candidate",
      expiresAt: confirmed ? null : new Date(now + this.config.candidateTtlMs).toISOString(),
      lastAccessAt: existing?.lastAccessAt,
      accessCount: existing?.accessCount ?? 0,
      createdAt: existing?.createdAt ?? new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    }

    if (confirmed) {
      await this.enforceMaxMemories(ctx)
    } else {
      await this.enforceMaxCandidates(ctx)
    }

    return this.store.put(ctx, item)
  }

  /** Aprende de un turno de chat completo (mensaje + intención detectada). */
  async learnFromTurn(ctx: MemoryContext, turn: MemoryTurnSignal): Promise<number> {
    const signals = extractSignals(turn.message, turn.intent, turn.domains)
    let learned = 0
    for (const signal of signals) {
      const result = await this.observe(ctx, toObservation(signal, ctx))
      if (result) learned += 1
    }
    return learned
  }

  private async enforceMaxCandidates(ctx: MemoryContext): Promise<void> {
    const candidates = await this.store.list(ctx, { status: "candidate" })
    if (candidates.length <= this.config.maxCandidates) return
    const oldest = [...candidates].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0]
    if (oldest) await this.store.remove(ctx, oldest.key)
  }

  private async enforceMaxMemories(ctx: MemoryContext): Promise<void> {
    const confirmed = await this.store.list(ctx, { status: "confirmed" })
    if (confirmed.length <= this.config.maxMemories) return
    const candidates = await this.store.list(ctx, { status: "candidate" })
    if (candidates.length > 0) {
      const oldest = [...candidates].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0]
      if (oldest) await this.store.remove(ctx, oldest.key)
      return
    }
    const lowest = [...confirmed].sort(
      (a, b) => (b.accessCount - a.accessCount) || a.updatedAt.localeCompare(b.updatedAt),
    )[0]
    if (lowest) await this.store.remove(ctx, lowest.key)
  }
}
