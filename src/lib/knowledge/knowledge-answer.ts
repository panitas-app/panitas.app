/**
 * Business Knowledge Base (FASE 7D) — Resumen con citas.
 *
 * Construye respuestas grounded: si la búsqueda encuentra documentos de la
 * Base de Conocimiento del negocio, la respuesta se arma con esa información y
 * una cita discreta («Según la política de garantías registrada por tu
 * negocio…»). Si no hay match, se indica que no hay conocimiento registrado y
 * se sigue el contexto habitual. Nunca inventa: solo se usa lo encontrado.
 */
import type { KnowledgeAnswer, KnowledgeCitation, KnowledgeDocumentView } from "./knowledge-types"

export interface KnowledgeAnswerHit {
  document: KnowledgeDocumentView
  score: number
  snippet: string | null
}

export interface BuildKnowledgeAnswerInput {
  query: string
  hits: KnowledgeAnswerHit[]
  /** Límite de documentos usados para armar la respuesta. */
  maxSources?: number
}

const DOCUMENT_TYPE_NAMES: Record<string, string> = {
  faq: "las preguntas frecuentes",
  procedure: "el procedimiento",
  policy: "la política",
  warranty: "la política de garantías",
  manual: "el manual",
  catalog: "el catálogo",
  technical: "la documentación técnica",
  pdf: "el documento",
  docx: "el documento",
  txt: "el documento",
  text: "el documento",
}

function describeType(type: string): string {
  return DOCUMENT_TYPE_NAMES[type] ?? "el documento"
}

/** Convierte un título en una frase corta de cita. */
function asCitation(title: string): string {
  return `"${title}"`
}

/**
 * Construye la respuesta grounded. Devuelve siempre una `KnowledgeAnswer`;
 * `grounded` es `true` solo si hubo match real en la Base de Conocimiento.
 */
export function buildKnowledgeAnswer(input: BuildKnowledgeAnswerInput): KnowledgeAnswer {
  const maxSources = input.maxSources ?? 3
  const top = [...input.hits]
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSources)

  if (top.length === 0) {
    return {
      content: `No tengo información registrada en la Base de Conocimiento de tu negocio sobre «${input.query}». Puedo buscar en el contexto habitual, o puedes registrar un documento para próximas consultas.`,
      dataSources: [],
      citations: [],
      grounded: false,
    }
  }

  const citations: KnowledgeCitation[] = top.map((h) => ({
    documentId: h.document.id,
    title: h.document.title,
    type: h.document.type,
  }))

  const first = top[0]
  const firstTitle = first.document.title
  const typeName = describeType(first.document.type)
  const snippet = first.snippet ?? first.document.summary ?? first.document.content.slice(0, 220)

  const content = `Según ${typeName} que registró tu negocio (${asCitation(firstTitle)}): ${snippet}`

  return {
    content,
    dataSources: top.map((h) => `knowledge:${h.document.id}`),
    citations,
    grounded: true,
  }
}
