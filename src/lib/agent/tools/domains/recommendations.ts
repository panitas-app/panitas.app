/**
 * Tools de recomendaciones operativas (FASE 4D).
 *
 * `recommendations.list`: genera/renueva recomendaciones (con cooldown
 * anti-spam) y devuelve la lista activa, lista para que el asistente las
 * presente en lenguaje natural. Solo lectura desde la perspectiva del usuario.
 */
import { createRecommendationService } from "@/lib/recommendations"
import type { RecommendationService } from "@/lib/recommendations"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk, toolFail } from "../response"
import type { ToolDeps } from "../deps"

export function createRecommendationsTools(deps: ToolDeps = {}): AgentTool[] {
  const recommendationService: RecommendationService =
    deps.recommendationService ?? createRecommendationService()

  const list: AgentTool = {
    name: "recommendations.list",
    domain: "recommendations",
    description:
      "Recomendaciones operativas del negocio basadas en datos: puntos que podría ser conveniente revisar (inventario, ventas, clientes, operaciones, precios). Úsala para responder preguntas como '¿qué me recomiendas revisar?'.",
    requiredPermissions: ["report.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      try {
        const recommendations = await recommendationService.refresh(buildServiceContext(ctx))
        return toolOk({
          recommendations,
          count: recommendations.length,
        })
      } catch (error: unknown) {
        return toolFail(error instanceof Error ? error.message : "No se pudieron generar las recomendaciones")
      }
    },
  }

  return [list]
}
