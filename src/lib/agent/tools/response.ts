/**
 * Response Standard del Tool System (FASE 3B).
 *
 * Todas las tools devuelven `ToolResponse`:
 *   { success: boolean, data: unknown, error: string | null, metadata: Record<string, unknown> }
 * Helpers para construirlas sin repetir el molde.
 */
import type { ToolResponse } from "./types"

export function toolOk(data: unknown, metadata: Record<string, unknown> = {}): ToolResponse {
  return { success: true, data, error: null, metadata }
}

export function toolFail(error: string, metadata: Record<string, unknown> = {}): ToolResponse {
  return { success: false, data: null, error, metadata }
}

export function isToolResponse(value: unknown): value is ToolResponse {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.success === "boolean" &&
    candidate.data !== undefined &&
    (typeof candidate.error === "string" || candidate.error === null) &&
    typeof candidate.metadata === "object" && candidate.metadata !== null
  )
}

/** Serializa una respuesta para consumo del modelo/agente (JSON compacto). */
export function serializeToolResponse(response: ToolResponse): string {
  return JSON.stringify(response)
}
