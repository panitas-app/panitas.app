/**
 * Tipos de la UI de la Business Knowledge Base (FASE 7D).
 *
 * Espejo de `@/lib/knowledge` sin dependencias de servidor: se consumen desde
 * los componentes cliente para tipar las respuestas de `/api/knowledge/*`.
 */

export interface KnowledgeCategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  isSystem: boolean
  documentCount: number
}

export interface KnowledgeTagItem {
  id: string
  name: string
  slug: string
  documentCount: number
}

export interface KnowledgeDoc {
  id: string
  storeId: string
  title: string
  content: string
  summary: string | null
  type: string
  source: string
  status: string
  fileName: string | null
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  version: number
  viewCount: number
  authorId: string | null
  authorName: string | null
  categoryIds: string[]
  categoryNames: string[]
  tagIds: string[]
  tagNames: string[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeHit {
  document: KnowledgeDoc
  score: number
  matchedOn: string[]
  snippet: string | null
}

export interface KnowledgeVersionItem {
  id: string
  version: number
  title: string
  changeNote: string | null
  authorId: string | null
  createdAt: string
}

export interface KnowledgeHistoryItem {
  id: string
  documentId: string | null
  action: string
  title: string | null
  userId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export const DOCUMENT_TYPES = [
  { value: "text", label: "Texto libre" },
  { value: "faq", label: "Preguntas frecuentes" },
  { value: "procedure", label: "Procedimiento interno" },
  { value: "policy", label: "Política del negocio" },
  { value: "warranty", label: "Garantía" },
  { value: "manual", label: "Manual" },
  { value: "catalog", label: "Catálogo" },
  { value: "technical", label: "Documentación técnica" },
  { value: "pdf", label: "Archivo PDF" },
  { value: "docx", label: "Documento DOCX" },
  { value: "txt", label: "Archivo TXT" },
] as const

export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? "Documento"
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
}

export const TYPE_COLORS: Record<string, string> = {
  policy: "bg-rose-100 text-rose-700",
  warranty: "bg-amber-100 text-amber-700",
  procedure: "bg-cyan-100 text-cyan-700",
  manual: "bg-blue-100 text-blue-700",
  catalog: "bg-violet-100 text-violet-700",
  faq: "bg-green-100 text-green-700",
  technical: "bg-slate-200 text-slate-700",
  text: "bg-muted text-muted-foreground",
  pdf: "bg-red-100 text-red-700",
  docx: "bg-indigo-100 text-indigo-700",
  txt: "bg-zinc-100 text-zinc-700",
}
