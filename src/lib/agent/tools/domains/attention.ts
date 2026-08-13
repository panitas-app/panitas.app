/**
 * Tools de Atención (FASE 8C).
 *
 * Permiten que Panitas EXPLIQUE las situaciones reales del negocio (qué
 * requiere atención, por qué y qué se puede hacer). Las tools NUNCA inventan
 * alertas: solo leen AttentionItems generados por reglas deterministas sobre
 * datos reales, y se re-sincronizan (throttled) antes de responder.
 */
import { AttentionService, syncIfStale } from "@/lib/attention"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createAttentionTools(deps: ToolDeps = {}): AgentTool[] {
  const service = deps.attentionService ?? new AttentionService()

  const attentionSummary: AgentTool = {
    name: "attention.summary",
    domain: "attention",
    description:
      "Situaciones del negocio que requieren atención, agrupadas por tipo (productos agotados, cuotas vencidas, conversaciones sin responder, proveedores, pedidos, canales). Úsala para responder '¿qué tengo pendiente?' o '¿qué necesita atención?'.",
    requiredPermissions: ["report.read"],
    inputSchema: { type: "object", properties: {} },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const storeId = ctx.storeId
      await syncIfStale(service, storeId)
      const [groups, overview] = await Promise.all([
        service.group(storeId, {}),
        service.overview(storeId),
      ])
      return toolOk({
        total: overview.open,
        byPriority: overview.byPriority,
        situations: groups.map((group) => ({
          type: group.type,
          label: group.label,
          count: group.total,
          priority: group.priority,
          example: group.items[0]?.title ?? null,
        })),
      })
    },
  }

  const attentionPending: AgentTool = {
    name: "attention.getPending",
    domain: "attention",
    description:
      "Lista las situaciones abiertas que requieren atención, con su título, descripción, prioridad y recomendación. Úsala cuando el usuario quiera el detalle de lo que debe revisar.",
    requiredPermissions: ["report.read"],
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filtro opcional por tipo de atención (ej. credit.overdue, conversation.pending)." },
        priority: { type: "string", description: "Filtro opcional por prioridad (critical, high, medium, low)." },
        limit: { type: "number", description: "Máximo de items a devolver (por defecto 20)." },
      },
    },
    async execute(ctx: ToolExecutionContext, args: Record<string, unknown> = {}): Promise<ToolResponse> {
      const storeId = ctx.storeId
      await syncIfStale(service, storeId)
      const items = await service.list(storeId, {
        status: "open",
        type: typeof args.type === "string" ? (args.type as never) : undefined,
        priority: typeof args.priority === "string" ? (args.priority as never) : undefined,
        limit: typeof args.limit === "number" ? args.limit : 20,
      })
      return toolOk({
        count: items.length,
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          priority: item.priority,
          title: item.title,
          description: item.description,
          recommendation: item.recommendation,
          action: item.action,
        })),
      })
    },
  }

  return [attentionSummary, attentionPending]
}
