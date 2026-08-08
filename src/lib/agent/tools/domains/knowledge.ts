/**
 * Tools de la Business Knowledge Base (FASE 7D).
 *
 * `knowledge.search`: busca en la Base de Conocimiento del negocio (título,
 * contenido, categorías, etiquetas) y devuelve hits rankeados con snippet.
 * El agente usa esta tool para responder preguntas sobre políticas,
 * procedimientos, garantías y manuales registrados por la tienda — nunca
 * inventa: si no hay match, no hay respuesta de conocimiento.
 */
import { KnowledgeService, createKnowledgeService } from "@/lib/knowledge"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk, toolFail } from "../response"
import type { ToolDeps } from "../deps"

export function createKnowledgeTools(deps: ToolDeps = {}): AgentTool[] {
  const knowledgeService: KnowledgeService =
    deps.knowledgeService ?? createKnowledgeService({ source: "agent" })

  const search: AgentTool = {
    name: "knowledge.search",
    domain: "knowledge",
    description:
      "Busca en la Base de Conocimiento del negocio (políticas, garantías, procedimientos, manuales, FAQs, catálogos). Úsala para responder preguntas como '¿cuál es la política de garantías?', '¿cómo se hace X?', '¿qué incluye el manual?'.",
    requiredPermissions: ["knowledge.read"],
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto de búsqueda (título, contenido, categoría o etiqueta)", required: true },
        limit: { type: "number", description: "Máximo de resultados (por defecto 5)" },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      try {
        const query = typeof input.query === "string" ? input.query.trim() : ""
        if (!query) return toolFail("Indica qué buscar en la Base de Conocimiento")
        const limit = typeof input.limit === "number" ? Math.min(Math.max(Math.floor(input.limit), 1), 10) : 5
        const result = await knowledgeService.search(buildServiceContext(ctx), {
          query,
          limit,
        })
        return toolOk({
          hits: result.hits.map((h) => ({
            documentId: h.document.id,
            title: h.document.title,
            type: h.document.type,
            summary: h.document.summary,
            snippet: h.snippet,
            score: h.score,
            categories: h.document.categoryNames,
            tags: h.document.tagNames,
          })),
          total: result.total,
        })
      } catch (error: unknown) {
        return toolFail(error instanceof Error ? error.message : "No se pudo buscar en la Base de Conocimiento")
      }
    },
  }

  const list: AgentTool = {
    name: "knowledge.list",
    domain: "knowledge",
    description:
      "Lista los documentos publicados de la Base de Conocimiento del negocio (título, tipo, categorías). Úsala para responder '¿qué documentos tiene mi negocio?'.",
    requiredPermissions: ["knowledge.read"],
    inputSchema: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "Filtra por categoría" },
        type: { type: "string", description: "Filtra por tipo (policy, warranty, procedure, faq, manual...)" },
        limit: { type: "number", description: "Máximo de documentos (por defecto 20)" },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      try {
        const result = await knowledgeService.listDocuments(buildServiceContext(ctx), {
          status: "published",
          categoryId: typeof input.categoryId === "string" ? input.categoryId : undefined,
          type: typeof input.type === "string" ? input.type : undefined,
          limit: typeof input.limit === "number" ? Math.min(Math.max(Math.floor(input.limit), 1), 50) : 20,
        })
        return toolOk({
          items: result.items.map((d) => ({
            documentId: d.id,
            title: d.title,
            type: d.type,
            summary: d.summary,
            categories: d.categoryNames,
            updatedAt: d.updatedAt,
          })),
          total: result.total,
        })
      } catch (error: unknown) {
        return toolFail(error instanceof Error ? error.message : "No se pudieron listar los documentos")
      }
    },
  }

  return [search, list]
}
