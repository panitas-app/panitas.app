/**
 * FASE 7D — Tests del motor de búsqueda híbrida.
 *
 * Usa un `KnowledgeSearchStore` mock (sin BD) para verificar: ranking por
 * keywords, tolerancia a typos vía fuse.js, bonos de recencia y popularidad,
 * `matchedOn`, snippets y la conversión `toView`.
 */
import { describe, expect, it, vi } from "vitest"
import {
  KnowledgeSearchEngine,
  buildSnippet,
  isKnownType,
  matchedOn,
  toView,
  type KnowledgeDocumentRow,
  type KnowledgeSearchStore,
} from "@/lib/knowledge"

function makeRow(over: Partial<KnowledgeDocumentRow> = {}): KnowledgeDocumentRow {
  return {
    id: "doc-1",
    storeId: "store-1",
    title: "Política de garantías",
    content: "Los productos tienen garantía por 30 días desde la entrega.",
    summary: "Resumen de la política",
    type: "policy",
    source: "manual",
    status: "published",
    fileName: null,
    fileUrl: null,
    fileType: null,
    fileSize: null,
    version: 1,
    viewCount: 5,
    authorId: "user-1",
    authorName: "Ana",
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    categories: [{ id: "c1", name: "Garantías", slug: "garantias", color: "#000" }],
    tags: [{ id: "t1", name: "devoluciones", slug: "devoluciones" }],
    ...over,
  }
}

function makeStore(rows: KnowledgeDocumentRow[]): KnowledgeSearchStore {
  return {
    search: vi.fn(async () => ({ rows, total: rows.length })),
  }
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

describe("KnowledgeSearchEngine — ranking", () => {
  it("prioriza el match en el título", async () => {
    const exact = makeRow({ id: "a", title: "Garantía de productos", content: "texto sobre garantía en contenido" })
    const loose = makeRow({ id: "b", title: "Otro tema", content: "menciona garantía una vez" })
    const engine = new KnowledgeSearchEngine(makeStore([loose, exact]))
    const result = await engine.search("store-1", { query: "garantía" })
    expect(result.hits[0].document.id).toBe("a")
    expect(result.hits[0].matchedOn).toContain("title")
  })

  it("excluye resultados sin relevancia cuando hay query", async () => {
    const row = makeRow({
      id: "a",
      title: "Completamente diferente",
      content: "Nada que ver con el tema consultado ni con devoluciones.",
      summary: "otro tema",
      categories: [{ id: "c2", name: "General", slug: "general", color: "#000" }],
      tags: [{ id: "t2", name: "misceláneo", slug: "miscelaneo" }],
    })
    const engine = new KnowledgeSearchEngine(makeStore([row]))
    const result = await engine.search("store-1", { query: "garantía" })
    expect(result.hits).toHaveLength(0)
  })

  it("tolera typos leves (fuzzy)", async () => {
    const row = makeRow({ id: "a", title: "Garantía de producto", content: "todo sobre garantías" })
    const engine = new KnowledgeSearchEngine(makeStore([row]))
    const result = await engine.search("store-1", { query: "garantia" })
    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.hits[0].document.id).toBe("a")
  })

  it("devuelve todo con query vacío (exploración)", async () => {
    const rows = [makeRow({ id: "a" }), makeRow({ id: "b", title: "Otra" })]
    const engine = new KnowledgeSearchEngine(makeStore(rows))
    const result = await engine.search("store-1", { query: "" })
    expect(result.hits).toHaveLength(2)
    expect(result.total).toBe(2)
  })
})

describe("KnowledgeSearchEngine — bonos", () => {
  it("premia la recencia", async () => {
    const fresh = makeRow({ id: "a", createdAt: daysAgo(1) })
    const old = makeRow({ id: "b", createdAt: daysAgo(400) })
    const engine = new KnowledgeSearchEngine(makeStore([old, fresh]))
    const result = await engine.search("store-1", { query: "" })
    expect(result.hits[0].document.id).toBe("a")
  })

  it("premia la popularidad (viewCount)", async () => {
    const popular = makeRow({ id: "a", createdAt: daysAgo(200), viewCount: 80 })
    const low = makeRow({ id: "b", createdAt: daysAgo(199), viewCount: 0 })
    const engine = new KnowledgeSearchEngine(makeStore([low, popular]))
    const result = await engine.search("store-1", { query: "" })
    expect(result.hits[0].document.id).toBe("a")
  })
})

describe("buildSnippet", () => {
  it("centra el fragmento alrededor del término", () => {
    const content = "Intro. " + "palabras ".repeat(30) + "GARANTÍA importante " + "más texto ".repeat(30)
    const snippet = buildSnippet(content, "garantía")
    expect(snippet).toBeTruthy()
    expect(snippet.toLowerCase()).toContain("garantía")
    expect(snippet.length).toBeLessThan(content.length)
  })

  it("devuelve el inicio si no hay término", () => {
    const snippet = buildSnippet("Hola mundo", "otra cosa")
    expect(snippet).toBe("Hola mundo")
  })

  it("devuelve null sin contenido", () => {
    expect(buildSnippet("  ", "x")).toBeNull()
  })
})

describe("matchedOn", () => {
  it("identifica el campo del match", () => {
    const row = makeRow({ title: "Garantía", content: "sin match", categories: [{ id: "c", name: "Envíos", slug: "envios" }] })
    expect(matchedOn(row, "garantía")).toEqual(["title"])
    expect(matchedOn(row, "envíos")).toEqual(["category"])
    expect(matchedOn(row, "devoluciones")).toEqual(["tag"])
  })

  it("devuelve vacío sin query o palabras cortas", () => {
    const row = makeRow()
    expect(matchedOn(row, "")).toEqual([])
    expect(matchedOn(row, "de")).toEqual([])
  })
})

describe("toView", () => {
  it("convierte la fila a vista pública", () => {
    const view = toView(makeRow())
    expect(view.categoryIds).toEqual(["c1"])
    expect(view.categoryNames).toEqual(["Garantías"])
    expect(view.tagNames).toEqual(["devoluciones"])
    expect(view.storeId).toBe("store-1")
    expect(view.viewCount).toBe(5)
  })
})

describe("isKnownType", () => {
  it("acepta solo tipos soportados", () => {
    expect(isKnownType("policy")).toBe(true)
    expect(isKnownType("pdf")).toBe(true)
    expect(isKnownType("bogus")).toBe(false)
    expect(isKnownType(undefined)).toBe(false)
  })
})
