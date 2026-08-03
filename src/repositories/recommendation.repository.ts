import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Recommendation Repository (FASE 4D).
 *
 * Único punto de acceso a BD para recomendaciones. Regla de aislamiento:
 * TODA query lleva el `storeId` del usuario autenticado en el `where`, de modo
 * que un usuario jamás lee/escribe recomendaciones de otro negocio.
 */
export type RecommendationScope = {
  storeId: string
}

export class RecommendationRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  listActive(scope: RecommendationScope, take = 5) {
    return this.db.recommendation.findMany({
      where: { storeId: scope.storeId, status: "active" },
      orderBy: { createdAt: "desc" },
      take,
    })
  }

  countActive(scope: RecommendationScope) {
    return this.db.recommendation.count({
      where: { storeId: scope.storeId, status: "active" },
    })
  }

  /** Recomendación más reciente de una regla creada desde `since` (anti-spam). */
  findRecentByRule(scope: RecommendationScope, ruleId: string, since: Date) {
    return this.db.recommendation.findFirst({
      where: {
        storeId: scope.storeId,
        ruleId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /** Última recomendación de una regla (historial). */
  findLastByRule(scope: RecommendationScope, ruleId: string) {
    return this.db.recommendation.findFirst({
      where: { storeId: scope.storeId, ruleId },
      orderBy: { createdAt: "desc" },
    })
  }

  findById(id: string, scope: RecommendationScope) {
    return this.db.recommendation.findFirst({
      where: { id, storeId: scope.storeId },
    })
  }

  create(data: Prisma.RecommendationUncheckedCreateInput) {
    return this.db.recommendation.create({ data })
  }

  /** Marca como vistas las activas de las reglas indicadas, excepto la recién creada. */
  supersedeActiveByRules(scope: RecommendationScope, ruleIds: string[], exceptId: string, at: Date) {
    return this.db.recommendation.updateMany({
      where: {
        storeId: scope.storeId,
        status: "active",
        ruleId: { in: ruleIds },
        NOT: { id: exceptId },
      },
      data: { status: "viewed", viewedAt: at },
    })
  }

  /** Actualiza solo si la recomendación pertenece al storeId autenticado. */
  updateStatus(
    id: string,
    scope: RecommendationScope,
    data: Prisma.RecommendationUpdateManyMutationInput
  ) {
    return this.db.recommendation.updateMany({
      where: { id, storeId: scope.storeId },
      data,
    })
  }
}
