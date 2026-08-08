/**
 * FASE 7D — Tests del servicio de la Business Knowledge Base.
 *
 * Usa un mock de Prisma en memoria para verificar multi-tenant, permisos por
 * rol, validaciones, versionado con snapshot, historial/auditoría, indexación
 * (embeddings placeholder) y emisión de eventos `knowledge.*`.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { KnowledgeService } from "@/lib/knowledge"
import { ServiceError } from "@/services/errors"
import type { StoreServiceContext } from "@/services/context"

vi.mock("@/lib/events", () => ({
  fireDomainEvent: vi.fn(),
}))

import { fireDomainEvent } from "@/lib/events"

const ctx = (role?: string): StoreServiceContext => ({
  storeId: "store-1",
  userId: "user-1",
  role,
  plan: "base",
  storeName: "Mi Tienda",
  storeEmail: null,
})

interface CatRef {
  id: string
  name: string
  slug: string
  color: string | null
  isSystem: boolean
  storeId: string
  description: string | null
}

interface TagRef {
  id: string
  name: string
  slug: string
  storeId: string
}

interface DocRow {
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
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  author: { name: string } | null
  categories: Array<{ categoryId: string; category: CatRef }>
  tags: Array<{ tagId: string; tag: TagRef }>
}

function baseDoc(over: Partial<DocRow> = {}): DocRow {
  const now = new Date()
  return {
    id: "doc-1",
    storeId: "store-1",
    title: "Política de garantías",
    content: "Los productos tienen garantía por 30 días desde la entrega.",
    summary: null,
    type: "policy",
    source: "manual",
    status: "published",
    fileName: null,
    fileUrl: null,
    fileType: null,
    fileSize: null,
    version: 1,
    viewCount: 0,
    authorId: "user-1",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    author: { name: "Ana" },
    categories: [],
    tags: [],
    ...over,
  }
}

const cat = (id: string, name: string, over: Partial<CatRef> = {}): CatRef => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-záéíóúñ]+/g, "-"),
  color: null,
  isSystem: false,
  storeId: "store-1",
  description: null,
  ...over,
})

const tag = (id: string, name: string, over: Partial<TagRef> = {}): TagRef => ({
  id,
  name,
  slug: name.toLowerCase(),
  storeId: "store-1",
  ...over,
})

interface DbSeed {
  docs?: DocRow[]
  categories?: CatRef[]
  tags?: TagRef[]
  versions?: Array<Record<string, unknown>>
  history?: Array<Record<string, unknown>>
  embeddings?: Array<Record<string, unknown>>
}

function makeDb(seed: DbSeed = {}) {
  const docs: DocRow[] = [...(seed.docs ?? [])]
  const categories: CatRef[] = [...(seed.categories ?? [])]
  const tags: TagRef[] = [...(seed.tags ?? [])]
  const versions: Array<Record<string, unknown>> = [...(seed.versions ?? [])]
  const history: Array<Record<string, unknown>> = [...(seed.history ?? [])]
  const embeddings: Array<Record<string, unknown>> = [...(seed.embeddings ?? [])]

  const linkCat = (categoryId: string): { categoryId: string; category: CatRef } => ({
    categoryId,
    category: categories.find((c) => c.id === categoryId) ?? cat(categoryId, "missing"),
  })
  const linkTag = (tagId: string): { tagId: string; tag: TagRef } => ({
    tagId,
    tag: tags.find((t) => t.id === tagId) ?? tag(tagId, "missing"),
  })

  function whereMatchesDoc(row: DocRow, where: Record<string, unknown>): boolean {
    if (where.storeId && row.storeId !== where.storeId) return false
    if (where.id && row.id !== where.id) return false
    if (where.status && row.status !== where.status) return false
    if (where.type && row.type !== where.type) return false
    if (where.authorId && row.authorId !== where.authorId) return false
    if (where.AND) {
      for (const clause of where.AND as Array<Record<string, unknown>>) {
        if (clause.categories) {
          const some = clause.categories.some as { categoryId: string }
          if (!row.categories.some((l) => l.categoryId === some.categoryId)) return false
        }
        if (clause.tags) {
          const some = clause.tags.some as { tagId: string }
          if (!row.tags.some((l) => l.tagId === some.tagId)) return false
        }
        if (clause.OR) {
          const or = clause.OR as Array<Record<string, { contains?: string }>>
          const hit = or.some((o) => {
            const title = o.title as { contains?: string } | undefined
            const content = o.content as { contains?: string } | undefined
            const q = (title?.contains ?? content?.contains ?? "").toLowerCase()
            return row.title.toLowerCase().includes(q) || row.content.toLowerCase().includes(q)
          })
          if (!hit) return false
        }
      }
    }
    return true
  }

  const db = {
    knowledgeDocument: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const row = docs.find((d) => whereMatchesDoc(d, where))
        return row ? { ...row } : null
      }),
      findMany: vi.fn(async ({ where, skip, take }: { where: Record<string, unknown>; skip?: number; take?: number }) => {
        const list = docs
          .filter((d) => whereMatchesDoc(d, where ?? {}))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        return (take !== undefined ? list.slice(skip ?? 0, (skip ?? 0) + take) : list).map((d) => ({ ...d }))
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => docs.filter((d) => whereMatchesDoc(d, where ?? {})).length),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row: DocRow = {
          id: `doc-${docs.length + 1}`,
          storeId: String(data.storeId),
          title: String(data.title),
          content: String(data.content),
          summary: (data.summary as string | null) ?? null,
          type: String(data.type),
          source: String(data.source),
          status: String(data.status),
          fileName: (data.fileName as string | null) ?? null,
          fileUrl: (data.fileUrl as string | null) ?? null,
          fileType: (data.fileType as string | null) ?? null,
          fileSize: (data.fileSize as number | null) ?? null,
          version: 1,
          viewCount: 0,
          authorId: (data.authorId as string | null) ?? null,
          publishedAt: data.status === "published" ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: null,
          categories: [],
          tags: [],
        }
        const categoryIds = ((data.categories as { create?: Array<{ categoryId: string }> })?.create ?? []) as Array<{ categoryId: string }>
        row.categories = categoryIds.map((l) => linkCat(l.categoryId))
        const tagIds = ((data.tags as { create?: Array<{ tagId: string }> })?.create ?? []) as Array<{ tagId: string }>
        row.tags = tagIds.map((l) => linkTag(l.tagId))
        docs.push(row)
        return { ...row }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = docs.find((d) => d.id === where.id)
        if (!row) throw new Error("not found")
        if (data.title !== undefined) row.title = String(data.title)
        if (data.content !== undefined) row.content = String(data.content)
        if (data.status !== undefined) row.status = String(data.status)
        if (data.type !== undefined) row.type = String(data.type)
        if (data.version !== undefined) row.version = Number(data.version)
        if (data.publishedAt !== undefined) row.publishedAt = data.publishedAt as Date | null
        if (data.summary !== undefined) row.summary = (data.summary as string | null) ?? null
        if (data.viewCount?.increment !== undefined) row.viewCount += data.viewCount.increment
        if (data.categories) {
          const create = data.categories.create as Array<{ categoryId: string }> | undefined
          if (create) row.categories = create.map((l) => linkCat(l.categoryId))
        }
        if (data.tags) {
          const create = data.tags.create as Array<{ tagId: string }> | undefined
          if (create) row.tags = create.map((l) => linkTag(l.tagId))
        }
        row.updatedAt = new Date()
        return { ...row }
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = docs.findIndex((d) => d.id === where.id)
        if (idx === -1) throw new Error("not found")
        docs.splice(idx, 1)
      }),
    },
    knowledgeVersion: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `v-${versions.length + 1}`, ...data }
        versions.push(record)
        return record
      }),
      findUnique: vi.fn(async ({ where }: { where: { documentId_version: { documentId: string; version: number } } }) => {
        const v = versions.find(
          (x) => x.documentId === where.documentId_version.documentId && x.version === where.documentId_version.version,
        )
        return v ? { ...v } : null
      }),
      findMany: vi.fn(async ({ where }: { where: { documentId?: string } }) => {
        return versions
          .filter((v) => v.documentId === where.documentId)
          .sort((a, b) => Number((b as { version: number }).version) - Number((a as { version: number }).version))
          .map((v) => ({ ...v }))
      }),
    },
    knowledgeHistory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `h-${history.length + 1}`, ...data, createdAt: new Date() }
        history.push(record)
        return record
      }),
      findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take?: number }) => {
        let list = history
          .filter((h) => (where.storeId ? h.storeId === where.storeId : true))
          .filter((h) => (where.documentId ? h.documentId === where.documentId : true))
          .sort((a, b) => new Date((b as { createdAt: Date }).createdAt).getTime() - new Date((a as { createdAt: Date }).createdAt).getTime())
        if (take !== undefined) list = list.slice(0, take)
        return list.map((h) => ({ ...h }))
      }),
    },
    knowledgeEmbedding: {
      deleteMany: vi.fn(async () => {
        embeddings.length = 0
        return { count: 0 }
      }),
      createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
        embeddings.push(...data)
        return { count: data.length }
      }),
    },
    knowledgeCategory: {
      findMany: vi.fn(async ({ where, include }: { where?: Record<string, unknown>; include?: { _count?: { select?: unknown } } } = {}) => {
        const list = categories.filter((c) => {
          if (where?.storeId && c.storeId !== where.storeId) return false
          if (where?.isSystem !== undefined && c.isSystem !== where.isSystem) return false
          if (where?.id?.in) {
            const inList = where.id.in as string[]
            if (!inList.includes(c.id)) return false
          }
          return true
        })
        if (include?._count) {
          return list.map((c) => ({
            ...c,
            _count: { documents: docs.filter((d) => d.categories.some((l) => l.categoryId === c.id)).length },
          }))
        }
        return list.map((c) => ({ ...c }))
      }),
      findUnique: vi.fn(async ({ where }: { where: { storeId_slug: { storeId: string; slug: string } } }) => {
        const c = categories.find((x) => x.storeId === where.storeId_slug.storeId && x.slug === where.storeId_slug.slug)
        return c ? { ...c } : null
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const c = categories.find((x) => x.id === where.id && x.storeId === where.storeId)
        return c ? { ...c } : null
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const ids = (where.id?.in as string[] | undefined) ?? []
        return categories.filter((c) => ids.includes(c.id) && c.storeId === where.storeId).length
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const c = cat(`c-${categories.length + 1}`, String(data.name), {
          storeId: String(data.storeId),
          slug: String(data.slug),
          description: (data.description as string | null) ?? null,
          color: (data.color as string) ?? null,
        })
        categories.push(c)
        return { ...c }
      }),
      createMany: vi.fn(async ({ data, skipDuplicates }: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }) => {
        let created = 0
        for (const item of data) {
          const dup = categories.some((c) => c.storeId === item.storeId && c.slug === item.slug)
          if (dup && skipDuplicates) continue
          categories.push(cat(`c-${categories.length + 1}`, String(item.name), {
            storeId: String(item.storeId),
            slug: String(item.slug),
            description: (item.description as string | null) ?? null,
            color: (item.color as string) ?? null,
            isSystem: Boolean(item.isSystem),
          }))
          created++
        }
        return { count: created }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const c = categories.find((x) => x.id === where.id)
        if (!c) throw new Error("not found")
        if (data.name !== undefined) c.name = String(data.name)
        if (data.slug !== undefined) c.slug = String(data.slug)
        if (data.description !== undefined) c.description = (data.description as string | null) ?? null
        if (data.color !== undefined) c.color = String(data.color)
        return { ...c }
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = categories.findIndex((c) => c.id === where.id)
        if (idx === -1) throw new Error("not found")
        categories.splice(idx, 1)
      }),
    },
    knowledgeTag: {
      findMany: vi.fn(async ({ where, include }: { where?: Record<string, unknown>; include?: { _count?: { select?: unknown } } } = {}) => {
        const list = tags.filter((t) => {
          if (where?.storeId && t.storeId !== where.storeId) return false
          if (where?.id?.in) {
            const inList = where.id.in as string[]
            if (!inList.includes(t.id)) return false
          }
          return true
        })
        if (include?._count) {
          return list.map((t) => ({ ...t, _count: { documents: docs.filter((d) => d.tags.some((l) => l.tagId === t.id)).length } }))
        }
        return list.map((t) => ({ ...t }))
      }),
      findUnique: vi.fn(async ({ where }: { where: { storeId_slug: { storeId: string; slug: string } } }) => {
        const t = tags.find((x) => x.storeId === where.storeId_slug.storeId && x.slug === where.storeId_slug.slug)
        return t ? { ...t } : null
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const t = tags.find((x) => x.id === where.id && x.storeId === where.storeId)
        return t ? { ...t } : null
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const ids = (where.id?.in as string[] | undefined) ?? []
        return tags.filter((t) => ids.includes(t.id) && t.storeId === where.storeId).length
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const t = tag(`t-${tags.length + 1}`, String(data.name), { storeId: String(data.storeId), slug: String(data.slug) })
        tags.push(t)
        return { ...t }
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const idx = tags.findIndex((t) => t.id === where.id)
        if (idx === -1) throw new Error("not found")
        tags.splice(idx, 1)
      }),
    },
  }

  return { db, docs, categories, tags, versions, history, embeddings }
}

let mocks: ReturnType<typeof makeDb>

beforeEach(() => {
  vi.clearAllMocks()
  mocks = makeDb()
})

function service() {
  return new KnowledgeService({ prisma: mocks.db as never, source: "test" })
}

// ─── Permisos ───────────────────────────────────────────────────────────────

describe("KnowledgeService — permisos", () => {
  it("seller puede crear y actualizar", async () => {
    const svc = service()
    await expect(svc.createDocument(ctx("seller"), { title: "Doc", content: "Contenido" })).resolves.toBeTruthy()
    const created = mocks.docs[0]
    await expect(svc.updateDocument(ctx("seller"), created.id, { summary: "resumen" })).resolves.toBeTruthy()
  })

  it("viewer puede leer pero no escribir", async () => {
    const svc = service()
    await expect(svc.listDocuments(ctx("viewer"))).resolves.toBeTruthy()
    await expect(svc.createDocument(ctx("viewer"), { title: "Doc", content: "Contenido" })).rejects.toMatchObject({ status: 403 })
  })

  it("sin rol (copiloto/agente) puede leer pero no escribir", async () => {
    const svc = service()
    await expect(svc.listDocuments(ctx(undefined))).resolves.toBeTruthy()
    await expect(svc.search(ctx(undefined), { query: "garantía" })).resolves.toBeTruthy()
    await expect(svc.createDocument(ctx(undefined), { title: "Doc", content: "Contenido" })).rejects.toMatchObject({ status: 403 })
  })

  it("delete definitivo requiere manage (admin/manager)", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await expect(svc.deleteDocument(ctx("seller"), "doc-1")).rejects.toMatchObject({ status: 403 })
    await expect(svc.deleteDocument(ctx("admin"), "doc-1")).resolves.toBeUndefined()
  })

  it("admin/manager pueden gestionar todo", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await expect(svc.deleteDocument(ctx("manager"), "doc-1")).resolves.toBeUndefined()
  })
})

// ─── Categorías y etiquetas ─────────────────────────────────────────────────

describe("KnowledgeService — categorías y etiquetas", () => {
  it("siembra las categorías del sistema una sola vez", async () => {
    const svc = service()
    const first = await svc.ensureSystemCategories(ctx("admin"))
    expect(first).toBeGreaterThan(0)
    const second = await svc.ensureSystemCategories(ctx("admin"))
    expect(second).toBe(0)
    expect(mocks.categories.filter((c) => c.isSystem).length).toBe(first)
  })

  it("no permite categorías duplicadas por slug", async () => {
    const svc = service()
    await svc.createCategory(ctx("admin"), { name: "Garantías" })
    await expect(svc.createCategory(ctx("admin"), { name: "garantías" })).rejects.toMatchObject({ status: 409 })
  })

  it("crea y elimina etiquetas con validación de longitud", async () => {
    const svc = service()
    await expect(svc.createTag(ctx("admin"), "x")).rejects.toMatchObject({ status: 400 })
    const tag = await svc.createTag(ctx("admin"), "devoluciones")
    expect(tag.slug).toBe("devoluciones")
    await expect(svc.deleteTag(ctx("admin"), tag.id)).resolves.toBeUndefined()
  })
})

// ─── Documentos ─────────────────────────────────────────────────────────────

describe("KnowledgeService — documentos", () => {
  it("rechaza documentos vacíos", async () => {
    const svc = service()
    await expect(svc.createDocument(ctx("admin"), { content: "" })).rejects.toMatchObject({ status: 400, code: "KNOWLEDGE_EMPTY_DOCUMENT" })
  })

  it("crea documento publicado con versión 1, historial e indexación", async () => {
    const svc = service()
    const doc = await svc.createDocument(ctx("admin"), {
      title: "Política de garantías",
      content: "Garantía de 30 días.",
      type: "policy",
    })
    expect(doc.version).toBe(1)
    expect(doc.status).toBe("published")
    expect(doc.publishedAt).not.toBeNull()
    expect(doc.authorName).toBeNull()

    const actions = mocks.history.map((h) => h.action)
    expect(actions).toContain("created")
    expect(actions).toContain("indexed")
    expect(mocks.embeddings.length).toBeGreaterThan(0)

    expect(fireDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "knowledge.document.created", tenantId: "store-1" }),
    )
    expect(fireDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "knowledge.document.indexed", tenantId: "store-1" }),
    )
  })

  it("respeta el estado borrador (sin publishedAt)", async () => {
    const svc = service()
    const doc = await svc.createDocument(ctx("admin"), { title: "Borrador", content: "texto", status: "draft" })
    expect(doc.status).toBe("draft")
    expect(doc.publishedAt).toBeNull()
  })

  it("valida que categorías/etiquetas pertenezcan al tenant", async () => {
    mocks = makeDb({
      categories: [cat("c-own", "Garantías"), cat("c-other", "Otra", { storeId: "store-999" })],
    })
    const svc = service()
    await expect(svc.createDocument(ctx("admin"), { title: "Doc", content: "x", categoryIds: ["c-own", "c-other"] }))
      .rejects.toMatchObject({ status: 400, code: "KNOWLEDGE_LINK_FORBIDDEN" })
  })

  it("versiona: snapshot previo, version+1 y eventos updated/indexed", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    const doc = await svc.updateDocument(ctx("admin"), "doc-1", { content: "Nuevo contenido", changeNote: "cambio" })

    expect(doc.version).toBe(2)
    expect(doc.content).toBe("Nuevo contenido")
    const snapshot = mocks.versions.find((v) => v.version === 1)
    expect(snapshot).toBeTruthy()
    expect(snapshot?.title).toBe("Política de garantías")
    expect(mocks.versions.find((v) => v.version === 2)).toBeFalsy()

    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "knowledge.document.updated" }))
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "knowledge.document.indexed" }))
  })

  it("no crea versión si no hay cambios", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await svc.updateDocument(ctx("admin"), "doc-1", { title: "Política de garantías" })
    expect(mocks.versions.length).toBe(0)
    expect(mocks.docs[0].version).toBe(1)
  })

  it("impide acceder a documentos de otra tienda (404)", async () => {
    mocks = makeDb({ docs: [baseDoc({ id: "other", storeId: "store-2" })] })
    const svc = service()
    await expect(svc.getDocument(ctx("admin"), "other")).rejects.toMatchObject({ status: 404 })
    await expect(svc.updateDocument(ctx("admin"), "other", { summary: "x" })).rejects.toMatchObject({ status: 404 })
  })

  it("archiva y registra en el historial", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await svc.archiveDocument(ctx("admin"), "doc-1")
    expect(mocks.docs[0].status).toBe("archived")
    expect(mocks.docs[0].publishedAt).toBeNull()
    expect(mocks.history.some((h) => h.action === "updated")).toBe(true)
    expect(fireDomainEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "knowledge.document.updated" }))
  })

  it("lista documentos con filtros y paginación", async () => {
    const now = new Date()
    mocks = makeDb({
      docs: [
        baseDoc({ id: "d1", status: "published" }),
        baseDoc({ id: "d2", status: "draft", updatedAt: new Date(now.getTime() + 1000) }),
      ],
    })
    const svc = service()
    const published = await svc.listDocuments(ctx("admin"), { status: "published" })
    expect(published.items).toHaveLength(1)
    expect(published.total).toBe(1)

    const all = await svc.listDocuments(ctx("admin"), {})
    expect(all.items.map((d) => d.id)).toEqual(["d2", "d1"])
  })
})

// ─── Versiones, vistas y búsqueda ───────────────────────────────────────────

describe("KnowledgeService — versiones, vistas y búsqueda", () => {
  it("restaura una versión anterior creando una versión nueva", async () => {
    const now = new Date()
    mocks = makeDb({
      docs: [baseDoc({ version: 2, updatedAt: now })],
      versions: [
        { id: "v1", documentId: "doc-1", version: 1, title: "Título viejo", content: "Contenido viejo", summary: null, changeNote: null },
      ],
    })
    const svc = service()
    const doc = await svc.restoreVersion(ctx("admin"), "doc-1", 1)
    expect(doc.version).toBe(3)
    expect(doc.title).toBe("Título viejo")
    expect(doc.content).toBe("Contenido viejo")
    expect(mocks.docs[0].version).toBe(3)
  })

  it("rechaza restaurar una versión inexistente", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await expect(svc.restoreVersion(ctx("admin"), "doc-1", 99)).rejects.toMatchObject({ status: 404 })
  })

  it("lista versiones ordenadas desc", async () => {
    mocks = makeDb({
      docs: [baseDoc()],
      versions: [
        { id: "v1", documentId: "doc-1", version: 1, title: "a", content: "a", summary: null, changeNote: null, createdAt: new Date() },
        { id: "v2", documentId: "doc-1", version: 2, title: "b", content: "b", summary: null, changeNote: "n", createdAt: new Date() },
      ],
    })
    const svc = service()
    const versions = await svc.listVersions(ctx("admin"), "doc-1")
    expect(versions.map((v) => v.version)).toEqual([2, 1])
  })

  it("registra vistas incrementando viewCount", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    await svc.recordView(ctx("admin"), "doc-1")
    expect(mocks.docs[0].viewCount).toBe(1)
    expect(mocks.history.some((h) => h.action === "viewed")).toBe(true)
  })

  it("emite knowledge.search.executed al buscar", async () => {
    mocks = makeDb({ docs: [baseDoc()] })
    const svc = service()
    const result = await svc.search(ctx("admin"), { query: "garantía" })
    expect(result.total).toBe(1)
    expect(result.hits[0].document.id).toBe("doc-1")
    expect(fireDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "knowledge.search.executed", tenantId: "store-1" }),
    )
  })

  it("listHistory expone la auditoría con metadatos parseados", async () => {
    mocks = makeDb({
      docs: [baseDoc()],
      history: [
        { id: "h1", storeId: "store-1", documentId: "doc-1", action: "created", title: "x", userId: "u", metadata: JSON.stringify({ version: 1 }), createdAt: new Date() },
      ],
    })
    const svc = service()
    const history = await svc.listHistory(ctx("admin"), { documentId: "doc-1" })
    expect(history[0].action).toBe("created")
    expect(history[0].metadata).toEqual({ version: 1 })
  })
})

// ─── Errores tipados ────────────────────────────────────────────────────────

describe("KnowledgeService — errores", () => {
  it("lanza ServiceError con código y status", async () => {
    const svc = service()
    try {
      await svc.getDocument(ctx("admin"), "no-existe")
      throw new Error("debería haber lanzado")
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError)
      expect((error as ServiceError).status).toBe(404)
      expect((error as ServiceError).code).toBe("KNOWLEDGE_DOCUMENT_NOT_FOUND")
    }
  })
})
