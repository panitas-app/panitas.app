/**
 * Recommendation Service (FASE 4D) — capa 1B.
 *
 * Servicio de negocio de recomendaciones operativas. Consume el Recommendation
 * Engine (4D) sobre el Business Monitor (4B) y persiste el historial en BD a
 * través del RecommendationRepository (aislamiento por `storeId`).
 *
 * Anti-spam: una regla no se vuelve a recomendar dentro de su período de
 * cooldown (definido en el catálogo). Cuando sí se renueva, la recomendación
 * activa anterior de la misma regla queda marcada como vista (supersession),
 * evitando duplicados en la lista activa.
 */
import { serviceError } from "@/services/errors"
import { RecommendationRepository } from "@/repositories/recommendation.repository"
import type { StoreServiceContext } from "@/services/context"
import { RecommendationEngine } from "../engine/recommendation-engine"
import { RecommendationSummaryGenerator } from "../generators/summary-generator"
import { recommendationRule } from "../rules"
import type { Recommendation, RecommendationCategory, RecommendationPriority, RecommendationStatus, RecommendationSummary } from "../types"

const DEFAULT_COOLDOWN_DAYS = 7

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function toRecommendation(rec: {
  id: string
  storeId: string
  ruleId: string
  category: string
  priority: string
  status: string
  title: string
  description: string
  reason: string | null
  dataSource: string | null
  suggestedAction: string | null
  entityId: string | null
  metadata: string | null
  createdAt: Date
  viewedAt: Date | null
  dismissedAt: Date | null
}): Recommendation {
  return {
    id: rec.id,
    storeId: rec.storeId,
    ruleId: rec.ruleId,
    category: rec.category as RecommendationCategory,
    priority: rec.priority as RecommendationPriority,
    status: rec.status as RecommendationStatus,
    title: rec.title,
    description: rec.description,
    reason: rec.reason ?? "",
    dataSource: rec.dataSource ?? "",
    suggestedAction: rec.suggestedAction ?? "",
    entityId: rec.entityId,
    metadata: parseMetadata(rec.metadata),
    createdAt: rec.createdAt.toISOString(),
    viewedAt: rec.viewedAt?.toISOString() ?? null,
    dismissedAt: rec.dismissedAt?.toISOString() ?? null,
  }
}

export interface RecommendationServiceDeps {
  engine?: RecommendationEngine
  repo?: RecommendationRepository
  generator?: RecommendationSummaryGenerator
  /** Máximo de recomendaciones activas devueltas (3-5). */
  maxRecommendations?: number
  /** Reloj inyectable para pruebas deterministas. */
  now?: () => Date
}

export class RecommendationService {
  private readonly engine: RecommendationEngine
  private readonly repo: RecommendationRepository
  private readonly generator: RecommendationSummaryGenerator
  private readonly maxRecommendations: number
  private readonly now: () => Date

  constructor(deps: RecommendationServiceDeps = {}) {
    this.engine = deps.engine ?? new RecommendationEngine()
    this.repo = deps.repo ?? new RecommendationRepository()
    this.generator = deps.generator ?? new RecommendationSummaryGenerator()
    this.maxRecommendations = deps.maxRecommendations ?? 5
    this.now = deps.now ?? (() => new Date())
  }

  /**
   * Genera candidatos, aplica cooldown/anti-spam, persiste los nuevos y
   * devuelve la lista activa (máximo 3-5). Es la entrada principal de la API
   * y de la tool del agente.
   */
  async refresh(ctx: StoreServiceContext): Promise<Recommendation[]> {
    const candidates = await this.engine.generate({ ctx })
    const now = this.now()

    for (const candidate of candidates) {
      const ruleDef = recommendationRule(candidate.ruleId)
      const cooldownDays = ruleDef?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS
      const since = new Date(now.getTime() - cooldownDays * 86_400_000)

      const recent = await this.repo.findRecentByRule({ storeId: ctx.storeId }, candidate.ruleId, since)
      if (recent) continue

      const created = await this.repo.create({
        storeId: ctx.storeId,
        userId: ctx.userId,
        ruleId: candidate.ruleId,
        category: candidate.category,
        priority: candidate.priority,
        status: "active",
        title: candidate.title,
        description: candidate.description,
        reason: candidate.reason,
        dataSource: candidate.dataSource,
        suggestedAction: candidate.suggestedAction,
        entityId: candidate.entityId,
        metadata: JSON.stringify({ metricValue: candidate.metricValue }),
        createdAt: now,
      })

      await this.repo.supersedeActiveByRules({ storeId: ctx.storeId }, [candidate.ruleId], created.id, now)
    }

    return this.listActive(ctx)
  }

  /** Recomendaciones activas (máximo configurado). */
  async listActive(ctx: StoreServiceContext): Promise<Recommendation[]> {
    const rows = await this.repo.listActive({ storeId: ctx.storeId }, this.maxRecommendations)
    return rows.map(toRecommendation)
  }

  /** Conteo de activas para el badge de la UI (sin límite). */
  async countActive(ctx: StoreServiceContext): Promise<number> {
    return this.repo.countActive({ storeId: ctx.storeId })
  }

  /** Marca una recomendación como vista o descartada (validando el storeId). */
  async markStatus(ctx: StoreServiceContext, id: string, action: "view" | "dismiss"): Promise<Recommendation> {
    const found = await this.repo.findById(id, { storeId: ctx.storeId })
    if (!found) {
      throw serviceError("Recomendación no encontrada", 404)
    }
    const now = this.now()
    const data =
      action === "dismiss"
        ? { status: "dismissed" as const, dismissedAt: now }
        : { status: "viewed" as const, viewedAt: now }

    await this.repo.updateStatus(id, { storeId: ctx.storeId }, data)
    return toRecommendation({ ...found, ...data, status: data.status })
  }

  /** Resumen en lenguaje natural (determinista) + contexto para el LLM. */
  async summarize(ctx: StoreServiceContext): Promise<RecommendationSummary> {
    const active = await this.listActive(ctx)
    return this.generator.summarize(active)
  }
}
