/**
 * Business Knowledge Base (FASE 7D) — Indexador.
 *
 * Separa en el índice los tres planos de cada documento:
 *
 *   1. Documento original  → fileName / fileUrl / fileType / fileSize.
 *   2. Contenido procesado → `content` + trozos (chunks) buscables.
 *   3. Metadatos           → tipo, estado, categorías, etiquetas, autor.
 *
 * Los embeddings se reservan (`null`) para el RAG futuro; hoy `vector` es
 * siempre `null` y el contenido vive en texto plano.
 */
import type { KnowledgeDocumentType, KnowledgeIndexedDocument, KnowledgeStatus } from "./knowledge-types"

export const KNOWLEDGE_CHUNK_MAX_CHARS = 1200
export const KNOWLEDGE_CHUNK_OVERLAP = 120

/** Cuenta aproximada de tokens (palabras). */
export function tokenCount(text: string): number {
  if (!text) return 0
  const clean = text.trim()
  if (!clean) return 0
  return clean.split(/\s+/).length
}

/**
 * Divide un texto en trozos con solapamiento, respetando límites de párrafo.
 * Los trozos nunca superan `maxChars`; un párrafo más largo se parte en
 * fragmentos.
 */
export function chunkText(
  text: string,
  options: { maxChars?: number; overlap?: number } = {},
): Array<{ index: number; text: string; tokens: number }> {
  const maxChars = options.maxChars ?? KNOWLEDGE_CHUNK_MAX_CHARS
  const overlap = options.overlap ?? KNOWLEDGE_CHUNK_OVERLAP
  const clean = (text ?? "").trim()
  if (!clean) return []

  const paragraphs = clean.split(/\n{2,}|\r\n\r\n/).filter((p) => p.trim())
  const chunks: string[] = []
  let current = ""

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim())
      current = ""
    }
  }

  for (const paragraph of paragraphs) {
    const p = paragraph.trim()
    if (!p) continue
    if (p.length > maxChars) {
      // Párrafo gigante → fragmentos lineales con solapamiento.
      flush()
      let rest = p
      while (rest.length > maxChars) {
        const cut = rest.slice(0, maxChars)
        // no cortar palabras si es razonable
        const lastSpace = cut.lastIndexOf(" ")
        const piece = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut
        chunks.push(piece.trim())
        rest = rest.slice(piece.length - overlap)
      }
      if (rest.trim()) chunks.push(rest.trim())
      continue
    }
    if (current.length + p.length + 1 <= maxChars) {
      current = current ? `${current}\n${p}` : p
    } else {
      flush()
      current = p
    }
  }
  flush()

  return chunks.map((text, index) => ({ index, text, tokens: tokenCount(text) }))
}

/** Extrae el título sugerido desde el contenido (primera línea relevante). */
export function extractTitleFromContent(content: string, max = 80): string {
  const first = (content ?? "")
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 3)
  if (!first) return ""
  return first.length > max ? `${first.slice(0, max - 1)}…` : first
}

export interface IndexDocumentInput {
  documentId: string
  version: number
  title: string
  content: string
  original: { fileName: string | null; fileUrl: string | null; fileType: string | null; fileSize: number | null }
  metadata: {
    type: KnowledgeDocumentType | string
    status: KnowledgeStatus | string
    categoryNames: string[]
    tagNames: string[]
    authorId: string | null
    createdAt: string
  }
}

/**
 * Construye el documento indexado (original / contenido / metadatos /
 * embeddings futuros) de forma pura. Los embeddings son placeholders vacíos:
 * el vector store se cableará en una fase RAG posterior.
 */
export function indexDocument(input: IndexDocumentInput): KnowledgeIndexedDocument {
  const chunks = chunkText(input.content)
  return {
    documentId: input.documentId,
    version: input.version,
    title: input.title,
    original: input.original,
    content: input.content,
    chunks,
    embeddings: chunks.map((chunk) => ({
      chunkIndex: chunk.index,
      model: null,
      dimensions: null,
      vector: null,
    })),
    metadata: input.metadata,
    indexedAt: new Date().toISOString(),
  }
}
