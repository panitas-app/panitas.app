/**
 * Tool System (FASE 3B) — API pública.
 *
 * El agente ejecuta tools únicamente a través de `ToolExecutor` con el
 * `toolRegistry`. Regla de capas: las tools nunca tocan Prisma/repositorios.
 */
export { ToolRegistry } from "./registry"
export { ToolExecutor } from "./executor"
export { toolRegistry, buildToolRegistry } from "./setup"
export { toolOk, toolFail, isToolResponse, serializeToolResponse } from "./response"
export { toolAllowed, missingPermissions } from "./permissions"
export { AuditToolLogger, NoopToolLogger } from "./logging"
export { validateToolInput } from "./validate"
export { buildServiceContext } from "./context"
export { toLegacyAgentTool } from "./bridge"
export type { ToolExecutorDeps } from "./executor"
export type {
  AgentTool,
  ToolDomain,
  ToolExecutionContext,
  ToolResponse,
  ToolParameter,
  ToolMetadata,
} from "./types"
export type { ToolDeps } from "./deps"
export type { ToolLogEntry, ToolLogEvent, ToolLogger } from "./logging"
export type { BusinessAlert } from "./domains"

// ─────────────────────────────────────────────────────────────────────────────
// Compatibilidad con el Tool Registry FASE 1C (herramientas flat).
// `availableTools` alimenta el registro legacy; se conserva intacto.
// ─────────────────────────────────────────────────────────────────────────────
import type { AgentTool as LegacyAgentTool } from "@/lib/agent/types"
import { inventoryTools } from "@/lib/agent/tools/inventory.tools"
import { productTools } from "@/lib/agent/tools/product.tools"
import { salesTools } from "@/lib/agent/tools/sales.tools"
import { customerTools } from "@/lib/agent/tools/customer.tools"
import { agendaTools } from "@/lib/agent/tools/agenda.tools"
import { orderTools } from "@/lib/agent/tools/order.tools"
import { reportTools } from "@/lib/agent/tools/report.tools"

export const availableTools: LegacyAgentTool[] = [
  ...inventoryTools,
  ...productTools,
  ...salesTools,
  ...customerTools,
  ...agendaTools,
  ...orderTools,
  ...reportTools,
]

export { inventoryTools } from "@/lib/agent/tools/inventory.tools"
export { productTools } from "@/lib/agent/tools/product.tools"
export { salesTools } from "@/lib/agent/tools/sales.tools"
export { customerTools } from "@/lib/agent/tools/customer.tools"
export { agendaTools } from "@/lib/agent/tools/agenda.tools"
export { orderTools } from "@/lib/agent/tools/order.tools"
export { reportTools } from "@/lib/agent/tools/report.tools"
