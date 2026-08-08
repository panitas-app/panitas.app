/**
 * FASE 7D — Tests del indexador de la Business Knowledge Base.
 *
 * Cubre `chunkText` (división por párrafos con solapamiento y párrafos
 * gigantes), `tokenCount`, `extractTitleFromContent` e `indexDocument`
 * (separación original / contenido / metadatos / embeddings placeholder).
 */
import { describe, expect, it } from "vitest"
import {
  KNOWLEDGE_CHUNK_MAX_CHARS,
  KNOWLEDGE_CHUNK_OVERLAP,
  chunkText,
  extractTitleFromContent,
  indexDocument,
  tokenCount,
} from "@/lib/knowledge"

describe("tokenCount", () => {
  it("cuenta palabras aproximadas", () => {
    expect(tokenCount("")).toBe(0)
    expect(tokenCount("   ")).toBe(0)
    expect(tokenCount("uno dos tres")).toBe(3)
  })
})

describe("extractTitleFromContent", () => {
  it("usa la primera línea relevante", () => {
    expect(extractTitleFromContent("\n\nPolítica de devoluciones\nDetalle...")).toBe("Política de devoluciones")
  })

  it("ignora líneas vacías y cortas", () => {
    expect(extractTitleFromContent("\n\n \n**Manual** de uso")).toBe("**Manual** de uso")
  })

  it("recorta títulos largos", () => {
    const long = "x".repeat(200)
    expect(extractTitleFromContent(long, 20)).toBe(`${"x".repeat(19)}…`)
  })

  it("devuelve vacío sin contenido", () => {
    expect(extractTitleFromContent("  \n  ")).toBe("")
  })
})

describe("chunkText", () => {
  it("devuelve vacío para texto vacío", () => {
    expect(chunkText("  ")).toEqual([])
  })

  it("agrupa párrafos cortos en un solo chunk", () => {
    const chunks = chunkText("Primer párrafo\n\nSegundo párrafo")
    expect(chunks.length).toBe(1)
    expect(chunks[0].text).toContain("Primer párrafo")
    expect(chunks[0].text).toContain("Segundo párrafo")
  })

  it("divide párrafos que exceden maxChars en fragmentos con solapamiento", () => {
    const text = `palabra ${"a".repeat(300)} final`
    const chunks = chunkText(text, { maxChars: 100, overlap: 20 })
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(100)
    }
    expect(chunks[0].tokens).toBeGreaterThan(0)
  })

  it("no excede maxChars en ningún chunk", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Párrafo número ${i} con contenido suficiente para llenar varios chunks de prueba.`).join("\n\n")
    const chunks = chunkText(text, { maxChars: 300, overlap: 30 })
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(300)
    }
  })

  it("conserva índices correlativos", () => {
    const chunks = chunkText(Array.from({ length: 30 }, (_, i) => `Bloque ${i} con texto para chunking.`).join("\n\n"), { maxChars: 120, overlap: 10 })
    chunks.forEach((c, i) => expect(c.index).toBe(i))
  })

  it("existe solapamiento configurable", () => {
    expect(KNOWLEDGE_CHUNK_MAX_CHARS).toBe(1200)
    expect(KNOWLEDGE_CHUNK_OVERLAP).toBe(120)
  })
})

describe("indexDocument", () => {
  it("separa original, contenido, metadatos y embeddings placeholder", () => {
    const indexed = indexDocument({
      documentId: "doc-1",
      version: 1,
      title: "Política de garantías",
      content: "Los productos tienen garantía por 30 días.",
      original: { fileName: "garantias.pdf", fileUrl: "/files/g.pdf", fileType: "application/pdf", fileSize: 1024 },
      metadata: {
        type: "policy",
        status: "published",
        categoryNames: ["Garantías"],
        tagNames: ["devoluciones"],
        authorId: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    })

    expect(indexed.documentId).toBe("doc-1")
    expect(indexed.original.fileName).toBe("garantias.pdf")
    expect(indexed.metadata.categoryNames).toEqual(["Garantías"])
    expect(indexed.content).toContain("garantía")
    expect(indexed.chunks.length).toBeGreaterThan(0)

    // Embeddings reservados para el RAG futuro: siempre null.
    for (const emb of indexed.embeddings) {
      expect(emb.model).toBeNull()
      expect(emb.dimensions).toBeNull()
      expect(emb.vector).toBeNull()
      expect(emb.chunkIndex).toBeTypeOf("number")
    }
    expect(indexed.embeddings.length).toBe(indexed.chunks.length)
  })

  it("genera un chunk vacío como lista vacía de embeddings", () => {
    const indexed = indexDocument({
      documentId: "doc-2",
      version: 2,
      title: "Vacío",
      content: "   ",
      original: { fileName: null, fileUrl: null, fileType: null, fileSize: null },
      metadata: { type: "text", status: "draft", categoryNames: [], tagNames: [], authorId: null, createdAt: "2026-01-01T00:00:00.000Z" },
    })
    expect(indexed.chunks).toEqual([])
    expect(indexed.embeddings).toEqual([])
  })
})
