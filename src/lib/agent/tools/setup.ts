/**
 * Setup del Tool System (FASE 3B).
 *
 * Construye el registro con todas las tools por dominio. La instancia por
 * defecto es `toolRegistry` (singleton). Permite inyectar dependencias (tests).
 */
import { ToolRegistry } from "./registry"
import { createInventoryTools } from "./domains"
import { createProductTools } from "./domains"
import { createSalesTools } from "./domains"
import { createCustomerTools } from "./domains"
import { createOrderTools } from "./domains"
import { createReportTools } from "./domains"
import { createAnalyticsTools } from "./domains"
import { createRecommendationsTools } from "./domains"
import { createKnowledgeTools } from "./domains"
import { createAttentionTools } from "./domains"
import type { ToolDeps } from "./deps"

export function buildToolRegistry(deps: ToolDeps = {}): ToolRegistry {
  const registry = new ToolRegistry()
  registry.registerAll([
    ...createInventoryTools(deps),
    ...createProductTools(deps),
    ...createSalesTools(deps),
    ...createCustomerTools(deps),
    ...createOrderTools(deps),
    ...createReportTools(deps),
    ...createAnalyticsTools(deps),
    ...createRecommendationsTools(deps),
    ...createKnowledgeTools(deps),
    ...createAttentionTools(deps),
  ])
  return registry
}

export const toolRegistry: ToolRegistry = buildToolRegistry()
