/**
 * Contratos del Tool System (FASE 3B).
 *
 * El agente SOLO interactúa con el negocio a través de Tools. Cada Tool:
 *   - declara nombre, dominio, descripción, parámetros y permisos requeridos;
 *   - ejecuta la acción llamando a la capa de servicios (`@/services/*`);
 *   - devuelve SIEMPRE `ToolResponse { success, data, error, metadata }`.
 *
 * Regla de capas: NINGUNA Tool importa Prisma (cliente directo) ni repositorios.
 * El `storeId`/`negocioId` proviene SOLO del contexto autenticado (aislamiento de negocio).
 */
import type { AgentPermission } from "@/lib/agent/permissions"

/** Dominios de negocio disponibles para agrupar tools. */
export type ToolDomain =
  | "inventory"
  | "products"
  | "sales"
  | "customers"
  | "orders"
  | "reports"
  | "analytics"
  | "business"

/** Contexto autenticado con el que se ejecuta una Tool (nunca construido desde input del usuario). */
export interface ToolExecutionContext {
  userId: string
  storeId: string
  negocioId?: string | null
  plan?: string
  role?: string
  permissions: AgentPermission[]
  metadata?: Record<string, unknown>
}

/** Respuesta estándar de TODAS las tools. No se permiten otros formatos. */
export interface ToolResponse {
  success: boolean
  data: unknown
  error: string | null
  metadata: Record<string, unknown>
}

/** Parámetro declarado en el inputSchema de una Tool. */
export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object"
  description?: string
  required?: boolean
}

/** Contrato común de una Tool. */
export interface AgentTool {
  /** Identificador único: `dominio.nombre` (p.ej. inventory.getStock). */
  name: string
  /** Dominio al que pertenece la tool. */
  domain: ToolDomain
  /** Descripción clara para que el modelo/agente sepa cuándo usarla. */
  description: string
  /** Permisos requeridos: basta con UNO de la lista (mismo criterio que FASE 1C). */
  requiredPermissions: AgentPermission[]
  /** Esquema de parámetros (para validación y para prompts del modelo). */
  inputSchema: {
    type: "object"
    properties: Record<string, ToolParameter>
  }
  /** Ejecuta la tool. Nunca accede a Prisma/repositorios; usa servicios. */
  execute(ctx: ToolExecutionContext, input: Record<string, unknown>): Promise<ToolResponse>
}

/** Metadata segura para exponer al agente (sin funciones ni input completo). */
export interface ToolMetadata {
  name: string
  domain: ToolDomain
  description: string
  requiredPermissions: AgentPermission[]
  inputSchema: AgentTool["inputSchema"]
}
