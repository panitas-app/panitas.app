/**
 * Business Knowledge Base (FASE 7D) — Eventos de dominio.
 *
 * Catálogo de eventos `knowledge.*` con `data.domain === "knowledge"` para
 * distinguirlos de los del inbox/copilot/comunicación. El listener asociado
 * (`knowledge.listener`) mantiene estado en memoria por documento y expone un
 * hook `onEvent` para la UI.
 */
export const KNOWLEDGE_EVENT_DOMAIN = "knowledge"

export const KNOWLEDGE_EVENTS = [
  "knowledge.document.created",
  "knowledge.document.updated",
  "knowledge.document.deleted",
  "knowledge.document.indexed",
  "knowledge.search.executed",
] as const
export type KnowledgeEventName = (typeof KNOWLEDGE_EVENTS)[number]

export interface KnowledgeEventRecord {
  tenantId: string
  type: KnowledgeEventName
  documentId?: string
  title?: string
  /** Para `knowledge.search.executed`. */
  query?: string
  hits?: number
  occurredAt: string
}

export const KNOWLEDGE_EVENT_LABELS: Record<KnowledgeEventName, string> = {
  "knowledge.document.created": "Documento creado",
  "knowledge.document.updated": "Documento actualizado",
  "knowledge.document.deleted": "Documento eliminado",
  "knowledge.document.indexed": "Documento indexado",
  "knowledge.search.executed": "Búsqueda ejecutada",
}
