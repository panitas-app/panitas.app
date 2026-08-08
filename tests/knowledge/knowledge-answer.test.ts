/**
 * FASE 7D — Tests del resumen grounded con citas.
 *
 * Verifica que cuando hay match en la Base de Conocimiento la respuesta se
 * arma con cita discreta («Según la política registrada por tu negocio…») y
 * que sin match nunca inventa (grounded: false).
 */
import { describe, expect, it } from "vitest"
import { buildKnowledgeAnswer, type KnowledgeAnswerHit } from "@/lib/knowledge"
import type { KnowledgeDocumentView } from "@/lib/knowledge"

function makeDoc(over: Partial<KnowledgeDocumentView> = {}): KnowledgeDocumentView {
  return {
    id: "doc-1",
    storeId: "store-1",
    title: "Política de garantías",
    content: "Los productos tienen garantía por 30 días desde la entrega.",
    summary: "Garantía de 30 días",
    type: "policy",
    source: "manual",
    status: "published",
    fileName: null,
    fileUrl: null,
    fileType: null,
    fileSize: null,
    version: 1,
    viewCount: 0,
    authorId: null,
    authorName: null,
    categoryIds: [],
    categoryNames: [],
    tagIds: [],
    tagNames: [],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  }
}

function hit(doc: KnowledgeDocumentView, score = 1, snippet: string | null = null): KnowledgeAnswerHit {
  return { document: doc, score, snippet }
}

describe("buildKnowledgeAnswer", () => {
  it("arma respuesta grounded con cita discreta", () => {
    const answer = buildKnowledgeAnswer({ query: "garantía", hits: [hit(makeDoc())] })
    expect(answer.grounded).toBe(true)
    expect(answer.content).toContain("Según la política que registró tu negocio")
    expect(answer.content).toContain('("Política de garantías")')
    expect(answer.citations).toHaveLength(1)
    expect(answer.citations[0].documentId).toBe("doc-1")
    expect(answer.dataSources).toEqual(["knowledge:doc-1"])
  })

  it("usa el snippet o resumen como respaldo", () => {
    const answer = buildKnowledgeAnswer({ query: "garantía", hits: [hit(makeDoc(), 1, "fragmento extraído")] })
    expect(answer.content).toContain("fragmento extraído")
  })

  it("usa el tipo de documento en la cita", () => {
    const warranty = hit(makeDoc({ type: "warranty" }))
    const answer = buildKnowledgeAnswer({ query: "garantía", hits: [warranty] })
    expect(answer.content).toContain("Según la política de garantías que registró tu negocio")
  })

  it("respeta maxSources", () => {
    const docs = [
      hit(makeDoc({ id: "d1" }), 1),
      hit(makeDoc({ id: "d2" }), 0.8),
      hit(makeDoc({ id: "d3" }), 0.6),
    ]
    const answer = buildKnowledgeAnswer({ query: "x", hits: docs, maxSources: 2 })
    expect(answer.citations).toHaveLength(2)
    expect(answer.citations.map((c) => c.documentId)).toEqual(["d1", "d2"])
  })

  it("ignora hits con score 0", () => {
    const answer = buildKnowledgeAnswer({ query: "x", hits: [hit(makeDoc(), 0)] })
    expect(answer.grounded).toBe(false)
  })

  it("no inventa cuando no hay match", () => {
    const answer = buildKnowledgeAnswer({ query: "algo sin registro", hits: [] })
    expect(answer.grounded).toBe(false)
    expect(answer.citations).toEqual([])
    expect(answer.dataSources).toEqual([])
    expect(answer.content).toContain("No tengo información registrada")
  })

  it("ordena por score antes de cortar", () => {
    const answer = buildKnowledgeAnswer({
      query: "x",
      hits: [hit(makeDoc({ id: "low" }), 0.5), hit(makeDoc({ id: "high" }), 0.9)],
      maxSources: 1,
    })
    expect(answer.citations[0].documentId).toBe("high")
  })
})
