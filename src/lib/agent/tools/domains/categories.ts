/**
 * Tools de categorías (fix FASE 11B — crear producto + categoría + stock en un prompt).
 *
 * El agente no tenía forma de crear/listar categorías: cuando el usuario pedía
 * crear una categoría y un producto juntos, el modelo inventaba un categoryId y
 * Prisma fallaba por FK (P2003), dejando el producto sin crear mientras la IA
 * afirmaba éxito. Estas tools permiten resolver la categoría con un ID real.
 */
import { CategoryService } from "@/services/category.service"
import type { AgentTool, ToolExecutionContext, ToolResponse } from "../types"
import { buildServiceContext } from "../context"
import { toolOk } from "../response"
import type { ToolDeps } from "../deps"

export function createCategoryTools(deps: ToolDeps = {}): AgentTool[] {
  const categoryService = deps.categoryService ?? new CategoryService()

  const create: AgentTool = {
    name: "categories.create",
    domain: "categories",
    description:
      "Crea una categoría de producto en el negocio. Si ya existe una con el mismo nombre, devuelve la existente. Devuelve el id real para usar en products.create.",
    requiredPermissions: ["product.create"],
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre de la categoría", required: true },
      },
    },
    async execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse> {
      const category = await categoryService.create(buildServiceContext(ctx), input)
      return toolOk(category)
    },
  }

  const list: AgentTool = {
    name: "categories.list",
    domain: "categories",
    description: "Lista las categorías de productos del negocio.",
    requiredPermissions: ["product.read"],
    inputSchema: {
      type: "object",
      properties: {},
    },
    async execute(ctx: ToolExecutionContext): Promise<ToolResponse> {
      const categories = await categoryService.list(buildServiceContext(ctx))
      return toolOk(categories)
    },
  }

  return [create, list]
}
