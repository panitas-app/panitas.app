/**
 * Presentación de la memoria del negocio (FASE 5G) — panel de gestión.
 *
 * Funciones puras que convierten ítems de memoria en el modelo de vista del
 * panel (agrupación por tipo, etiquetas, estado, fuerza) sin tocar BD.
 */
import type { BusinessMemoryItem, BusinessMemoryKind } from "./memory-types"
import { describeMemory } from "./memory-query"

export const BUSINESS_MEMORY_KIND_LABELS: Record<BusinessMemoryKind, string> = {
  terminology: "Terminología",
  preference: "Preferencias",
  operational_rule: "Reglas operativas",
  usage_pattern: "Patrones de uso",
}

export const BUSINESS_MEMORY_KIND_DESCRIPTIONS: Record<BusinessMemoryKind, string> = {
  terminology: "Cómo nombras los conceptos de tu negocio",
  preference: "Valores por defecto y gustos (moneda, reportes...)",
  operational_rule: "Reglas que el asistente debe respetar",
  usage_pattern: "Consultas y acciones frecuentes (consolidadas por repetición)",
}

export function memoryKindLabel(kind: BusinessMemoryKind): string {
  return BUSINESS_MEMORY_KIND_LABELS[kind] ?? kind
}

export function memoryStatusLabel(status: BusinessMemoryItem["status"]): string {
  return status === "confirmed" ? "Confirmado" : "En aprendizaje"
}

export interface MemoryPanelGroup {
  kind: BusinessMemoryKind
  label: string
  description: string
  memories: BusinessMemoryItem[]
}

/** Agrupa los recuerdos por tipo para el panel. */
export function groupMemories(items: BusinessMemoryItem[]): MemoryPanelGroup[] {
  const kinds: BusinessMemoryKind[] = ["terminology", "preference", "operational_rule", "usage_pattern"]
  return kinds
    .map((kind) => ({
      kind,
      label: BUSINESS_MEMORY_KIND_LABELS[kind],
      description: BUSINESS_MEMORY_KIND_DESCRIPTIONS[kind],
      memories: items
        .filter((i) => i.kind === kind)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    }))
    .filter((group) => group.memories.length > 0)
}

/** Texto descriptivo para el panel. */
export function memoryDescription(item: BusinessMemoryItem): string {
  return describeMemory(item)
}

/** "3/3" — fuerza alcanzada vs umbral (para candidatos). */
export function memoryStrengthLabel(item: BusinessMemoryItem): string {
  return `${item.metadata.strength}/${item.metadata.threshold}`
}

export interface MemoryPanelModel {
  groups: MemoryPanelGroup[]
  total: number
  confirmed: number
  candidates: number
  learningEnabled: boolean
}

/** Modelo de vista completo del panel a partir de ítems + estado de aprendizaje. */
export function buildPanelModel(
  items: BusinessMemoryItem[],
  learningEnabled: boolean,
): MemoryPanelModel {
  return {
    groups: groupMemories(items),
    total: items.length,
    confirmed: items.filter((i) => i.status === "confirmed").length,
    candidates: items.filter((i) => i.status === "candidate").length,
    learningEnabled,
  }
}
