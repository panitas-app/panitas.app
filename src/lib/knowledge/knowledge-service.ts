/**
 * Business Knowledge Base (FASE 7D) — Servicio de conocimiento.
 *
 * Fachada multi-tenant del Centro de Documentos: CRUD de documentos,
 * categorías y etiquetas, versionado, historial/auditoría, indexación
 * (original / contenido / metadatos / embeddings futuros), búsqueda híbrida,
 * eventos `knowledge.*` y permisos por rol de la tienda.
 *
 * Cada operación verifica pertenencia al tenant (`storeId`), registra en
 * `KnowledgeHistory` y emite eventos de dominio fire-and-forget.
 */
import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "@/lib/prisma"
import type { StoreServiceContext } from "@/services/context"
import { serviceError } from "@/services/errors"
import { fireDomainEvent } from "@/lib/events"
import type { KnowledgeDocumentView, KnowledgeSearchFilters } from "./knowledge-types"
import { KNOWLEDGE_DOCUMENT_TYPES, KNOWLEDGE_SOURCES, KNOWLEDGE_STATUSES, type KnowledgeDocumentType } from "./knowledge-types"
import { KNOWLEDGE_EVENT_DOMAIN, KNOWLEDGE_EVENTS, type KnowledgeEventName } from "./knowledge-events"
import { KNOWLEDGE_SYSTEM_CATEGORIES, isValidCategoryName, slugify } from "./knowledge-categories"
import { extractTitleFromContent, indexDocument, tokenCount } from "./knowledge-index"
import { KnowledgeSearchEngine, buildSnippet, createPrismaKnowledgeSearchStore, toView } from "./knowledge-search"

// ─── Permisos por rol ───────────────────────────────────────────────────────

const READ_ROLES = ["admin", "manager", "seller", "viewer"]
const WRITE_ROLES = ["admin", "manager", "seller"]
const MANAGE_ROLES = ["admin", "manager"]

export type KnowledgePermission = "read" | "write" | "manage"

function assertPermission(ctx: StoreServiceContext, permission: KnowledgePermission): void {
  const role = ctx.role
  if (permission === "read") {
    // Sin rol = acceso interno del sistema (copiloto/agente); las rutas HTTP
    // siempre envían el rol de la sesión.
    if (!role || READ_ROLES.includes(role)) return
  } else {
    const allowed = permission === "write" ? WRITE_ROLES : MANAGE_ROLES
    if (!role || !allowed.includes(role)) {
      throw serviceError(`No tienes permisos para esta acción de la Base de Conocimiento`, 403, "KNOWLEDGE_FORBIDDEN")
    }
  }
}

// ─── Tipos de entrada ───────────────────────────────────────────────────────

export interface CreateKnowledgeDocumentInput {
  title?: string
  content?: string
  summary?: string
  type?: KnowledgeDocumentType | string
  status?: string
  source?: string
  fileName?: string | null
  fileUrl?: string | null
  fileType?: string | null
  fileSize?: number | null
  categoryIds?: string[]
  tagIds?: string[]
  /** Nota opcional para la primera versión. */
  changeNote?: string
}

export interface UpdateKnowledgeDocumentInput {
  title?: string
  content?: string
  summary?: string | null
  type?: KnowledgeDocumentType | string
  status?: string
  categoryIds?: string[]
  tagIds?: string[]
  changeNote?: string
}

export interface CreateKnowledgeCategoryInput {
  name: string
  description?: string
  color?: string
}

export interface KnowledgeServiceOptions {
  prisma: PrismaClient
  /** Nombre del módulo emisor en los eventos. */
  source?: string
}

/** Fábrica con la instancia por defecto de Prisma (para tools/agente/rutas). */
export function createKnowledgeService(options: Omit<KnowledgeServiceOptions, "prisma"> = {}): KnowledgeService {
  return new KnowledgeService({ prisma: defaultPrisma, ...options })
}

// ─── Historial auxiliar ─────────────────────────────────────────────────────

function safeJson(value: unknown): string | null {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return null
  }
}

function parseJson<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

// ─── Servicio ───────────────────────────────────────────────────────────────

export class KnowledgeService {
  private readonly prisma: PrismaClient
  private readonly source: string

  constructor(options: KnowledgeServiceOptions) {
    this.prisma = options.prisma
    this.source = options.source ?? "knowledge.service"
  }

  // ── Emisión de eventos ───────────────────────────────────────────────────

  private fireEvent(input: {
    ctx: StoreServiceContext
    type: KnowledgeEventName
    documentId?: string
    title?: string
    query?: string
    hits?: number
  }): void {
    fireDomainEvent({
      type: input.type,
      data: {
        domain: KNOWLEDGE_EVENT_DOMAIN,
        documentId: input.documentId,
        title: input.title,
        query: input.query,
        hits: input.hits,
      },
      aggregateId: input.documentId,
      tenantId: input.ctx.storeId,
      actorId: input.ctx.userId,
      source: this.source,
    })
  }

  private async addHistory(ctx: StoreServiceContext, input: {
    documentId?: string | null
    action: string
    title?: string | null
    metadata?: unknown
  }): Promise<void> {
    await this.prisma.knowledgeHistory.create({
      data: {
        storeId: ctx.storeId,
        documentId: input.documentId ?? null,
        action: input.action,
        title: input.title ?? null,
        userId: ctx.userId,
        metadata: safeJson(input.metadata),
      },
    })
  }

  // ── Categorías del sistema ───────────────────────────────────────────────

  /** Siembra las categorías del sistema para la tienda (idempotente). */
  async ensureSystemCategories(ctx: StoreServiceContext): Promise<number> {
    assertPermission(ctx, "read")
    const existing = await this.prisma.knowledgeCategory.findMany({
      where: { storeId: ctx.storeId, isSystem: true },
      select: { slug: true },
    })
    const have = new Set(existing.map((c) => c.slug))
    const missing = KNOWLEDGE_SYSTEM_CATEGORIES.filter((c) => !have.has(c.slug))
    if (missing.length === 0) return 0
    const created = await this.prisma.knowledgeCategory.createMany({
      data: missing.map((c) => ({
        storeId: ctx.storeId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        color: c.color,
        isSystem: true,
      })),
      skipDuplicates: true,
    })
    if (created.count > 0) {
      await this.addHistory(ctx, { action: "category.created", title: `Categorías del sistema (${created.count})` })
    }
    return created.count
  }

  // ── Categorías ───────────────────────────────────────────────────────────

  async listCategories(ctx: StoreServiceContext): Promise<Array<{
    id: string
    storeId: string
    name: string
    slug: string
    description: string | null
    color: string
    isSystem: boolean
    documentCount: number
  }>> {
    assertPermission(ctx, "read")
    const categories = await this.prisma.knowledgeCategory.findMany({
      where: { storeId: ctx.storeId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { _count: { select: { documents: true } } },
    })
    return categories.map((c) => ({
      id: c.id,
      storeId: c.storeId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      color: c.color,
      isSystem: c.isSystem,
      documentCount: c._count.documents,
    }))
  }

  async createCategory(ctx: StoreServiceContext, input: CreateKnowledgeCategoryInput): Promise<{ id: string; name: string; slug: string }> {
    assertPermission(ctx, "write")
    const name = input.name?.trim()
    if (!isValidCategoryName(name ?? "")) throw serviceError("El nombre de la categoría debe tener entre 2 y 40 caracteres", 400, "KNOWLEDGE_INVALID_CATEGORY")
    const slug = slugify(name)
    const existing = await this.prisma.knowledgeCategory.findUnique({
      where: { storeId_slug: { storeId: ctx.storeId, slug } },
    })
    if (existing) throw serviceError(`Ya existe la categoría "${existing.name}"`, 409, "KNOWLEDGE_CATEGORY_EXISTS")
    const category = await this.prisma.knowledgeCategory.create({
      data: {
        storeId: ctx.storeId,
        name,
        slug,
        description: input.description?.trim() || null,
        color: input.color || "#6366f1",
      },
    })
    await this.addHistory(ctx, { action: "category.created", title: category.name, metadata: { categoryId: category.id } })
    return { id: category.id, name: category.name, slug: category.slug }
  }

  async updateCategory(ctx: StoreServiceContext, categoryId: string, patch: Partial<CreateKnowledgeCategoryInput>): Promise<void> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeCategory.findFirst({
      where: { id: categoryId, storeId: ctx.storeId },
    })
    if (!existing) throw serviceError("Categoría no encontrada", 404, "KNOWLEDGE_CATEGORY_NOT_FOUND")
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!isValidCategoryName(name)) throw serviceError("El nombre de la categoría debe tener entre 2 y 40 caracteres", 400, "KNOWLEDGE_INVALID_CATEGORY")
      const dup = await this.prisma.knowledgeCategory.findFirst({
        where: { storeId: ctx.storeId, slug: slugify(name), id: { not: categoryId } },
      })
      if (dup) throw serviceError(`Ya existe la categoría "${dup.name}"`, 409, "KNOWLEDGE_CATEGORY_EXISTS")
    }
    await this.prisma.knowledgeCategory.update({
      where: { id: categoryId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name.trim(), slug: slugify(patch.name) } : {}),
        ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      },
    })
    await this.addHistory(ctx, { action: "category.updated", title: patch.name?.trim() ?? existing.name, metadata: { categoryId } })
  }

  async deleteCategory(ctx: StoreServiceContext, categoryId: string): Promise<void> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeCategory.findFirst({
      where: { id: categoryId, storeId: ctx.storeId },
    })
    if (!existing) throw serviceError("Categoría no encontrada", 404, "KNOWLEDGE_CATEGORY_NOT_FOUND")
    await this.prisma.knowledgeCategory.delete({ where: { id: categoryId } })
    await this.addHistory(ctx, { action: "category.deleted", title: existing.name, metadata: { categoryId } })
  }

  // ── Etiquetas ────────────────────────────────────────────────────────────

  async listTags(ctx: StoreServiceContext): Promise<Array<{ id: string; name: string; slug: string; documentCount: number }>> {
    assertPermission(ctx, "read")
    const tags = await this.prisma.knowledgeTag.findMany({
      where: { storeId: ctx.storeId },
      orderBy: { name: "asc" },
      include: { _count: { select: { documents: true } } },
    })
    return tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, documentCount: t._count.documents }))
  }

  async createTag(ctx: StoreServiceContext, name: string): Promise<{ id: string; name: string; slug: string }> {
    assertPermission(ctx, "write")
    const clean = name?.trim()
    if (!clean || clean.length < 2 || clean.length > 30) throw serviceError("El nombre de la etiqueta debe tener entre 2 y 30 caracteres", 400, "KNOWLEDGE_INVALID_TAG")
    const slug = slugify(clean)
    const existing = await this.prisma.knowledgeTag.findUnique({ where: { storeId_slug: { storeId: ctx.storeId, slug } } })
    if (existing) throw serviceError(`Ya existe la etiqueta "${existing.name}"`, 409, "KNOWLEDGE_TAG_EXISTS")
    const tag = await this.prisma.knowledgeTag.create({ data: { storeId: ctx.storeId, name: clean, slug } })
    await this.addHistory(ctx, { action: "tag.created", title: tag.name, metadata: { tagId: tag.id } })
    return { id: tag.id, name: tag.name, slug: tag.slug }
  }

  async deleteTag(ctx: StoreServiceContext, tagId: string): Promise<void> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeTag.findFirst({ where: { id: tagId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Etiqueta no encontrada", 404, "KNOWLEDGE_TAG_NOT_FOUND")
    await this.prisma.knowledgeTag.delete({ where: { id: tagId } })
    await this.addHistory(ctx, { action: "tag.deleted", title: existing.name, metadata: { tagId } })
  }

  // ── Documentos ───────────────────────────────────────────────────────────

  private async validateLinks(ctx: StoreServiceContext, categoryIds: string[], tagIds: string[]): Promise<void> {
    if (categoryIds.length > 0) {
      const count = await this.prisma.knowledgeCategory.count({ where: { storeId: ctx.storeId, id: { in: categoryIds } } })
      if (count !== categoryIds.length) throw serviceError("Una de las categorías no pertenece a tu negocio", 400, "KNOWLEDGE_LINK_FORBIDDEN")
    }
    if (tagIds.length > 0) {
      const count = await this.prisma.knowledgeTag.count({ where: { storeId: ctx.storeId, id: { in: tagIds } } })
      if (count !== tagIds.length) throw serviceError("Una de las etiquetas no pertenece a tu negocio", 400, "KNOWLEDGE_LINK_FORBIDDEN")
    }
  }

  private async reindex(ctx: StoreServiceContext, documentId: string, version: number, doc: {
    title: string
    content: string
    type: string
    status: string
    fileName: string | null
    fileUrl: string | null
    fileType: string | null
    fileSize: number | null
    categoryNames: string[]
    tagNames: string[]
  }): Promise<void> {
    const indexed = indexDocument({
      documentId,
      version,
      title: doc.title,
      content: doc.content,
      original: { fileName: doc.fileName, fileUrl: doc.fileUrl, fileType: doc.fileType, fileSize: doc.fileSize },
      metadata: {
        type: doc.type,
        status: doc.status,
        categoryNames: doc.categoryNames,
        tagNames: doc.tagNames,
        authorId: null,
        createdAt: new Date().toISOString(),
      },
    })
    await this.prisma.knowledgeEmbedding.deleteMany({ where: { documentId, version } })
    if (indexed.chunks.length > 0) {
      await this.prisma.knowledgeEmbedding.createMany({
        data: indexed.chunks.map((chunk) => ({
          documentId,
          version,
          chunkIndex: chunk.index,
          chunk: chunk.text,
          vector: null,
          model: null,
          dimensions: null,
        })),
      })
    }
  }

  async createDocument(ctx: StoreServiceContext, input: CreateKnowledgeDocumentInput): Promise<KnowledgeDocumentView> {
    assertPermission(ctx, "write")
    const content = (input.content ?? "").trim()
    if (!content && !input.fileName) throw serviceError("El documento necesita contenido o un archivo", 400, "KNOWLEDGE_EMPTY_DOCUMENT")
    if (tokenCount(content) > 200_000) throw serviceError("El documento es demasiado grande para indexarlo", 400, "KNOWLEDGE_TOO_LARGE")

    const title = input.title?.trim() || extractTitleFromContent(content) || input.fileName?.trim() || "Documento sin título"
    const type = KNOWLEDGE_DOCUMENT_TYPES.includes(input.type as KnowledgeDocumentType) ? (input.type as string) : "text"
    const status = KNOWLEDGE_STATUSES.includes(input.status as never) ? (input.status as string) : "published"
    const source = KNOWLEDGE_SOURCES.includes(input.source as never) ? (input.source as string) : "manual"
    const categoryIds = input.categoryIds ?? []
    const tagIds = input.tagIds ?? []

    await this.validateLinks(ctx, categoryIds, tagIds)

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        storeId: ctx.storeId,
        title,
        content,
        summary: input.summary?.trim() || null,
        type,
        source,
        status,
        fileName: input.fileName ?? null,
        fileUrl: input.fileUrl ?? null,
        fileType: input.fileType ?? null,
        fileSize: input.fileSize ?? null,
        authorId: ctx.userId,
        publishedAt: status === "published" ? new Date() : null,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    })

    // Indexación: separa original / contenido / metadatos / embeddings futuros.
    const categories = categoryIds.length > 0
      ? await this.prisma.knowledgeCategory.findMany({ where: { id: { in: categoryIds } }, select: { name: true } })
      : []
    const tags = tagIds.length > 0
      ? await this.prisma.knowledgeTag.findMany({ where: { id: { in: tagIds } }, select: { name: true } })
      : []
    await this.reindex(ctx, document.id, document.version, {
      title: document.title,
      content: document.content,
      type: document.type,
      status: document.status,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      fileType: document.fileType,
      fileSize: document.fileSize,
      categoryNames: categories.map((c) => c.name),
      tagNames: tags.map((t) => t.name),
    })

    if (status === "published") {
      await this.prisma.knowledgeDocument.update({ where: { id: document.id }, data: { publishedAt: new Date() } })
    }

    await this.addHistory(ctx, { documentId: document.id, action: "created", title: document.title, metadata: { version: document.version, type, source } })
    await this.addHistory(ctx, { documentId: document.id, action: "indexed", title: document.title, metadata: { version: document.version } })
    this.fireEvent({ ctx, type: "knowledge.document.created", documentId: document.id, title: document.title })
    this.fireEvent({ ctx, type: "knowledge.document.indexed", documentId: document.id, title: document.title })

    return this.requireDocument(ctx, document.id)
  }

  private async requireDocument(ctx: StoreServiceContext, documentId: string): Promise<KnowledgeDocumentView> {
    const row = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, storeId: ctx.storeId },
      include: {
        author: { select: { name: true } },
        categories: { include: { category: { select: { id: true, name: true, slug: true, color: true } } } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    })
    if (!row) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    return toView({
      id: row.id,
      storeId: row.storeId,
      title: row.title,
      content: row.content,
      summary: row.summary,
      type: row.type,
      source: row.source,
      status: row.status,
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      fileType: row.fileType,
      fileSize: row.fileSize,
      version: row.version,
      viewCount: row.viewCount,
      authorId: row.authorId,
      authorName: row.author?.name ?? null,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      categories: row.categories.map((jc) => ({ id: jc.category.id, name: jc.category.name, slug: jc.category.slug, color: jc.category.color ?? null })),
      tags: row.tags.map((jt) => ({ id: jt.tag.id, name: jt.tag.name, slug: jt.tag.slug })),
    })
  }

  async getDocument(ctx: StoreServiceContext, documentId: string): Promise<KnowledgeDocumentView> {
    assertPermission(ctx, "read")
    return this.requireDocument(ctx, documentId)
  }

  /** Lista documentos del tenant (todos los estados para gestión). */
  async listDocuments(ctx: StoreServiceContext, filters: {
    status?: string
    type?: string
    categoryId?: string
    tagId?: string
    authorId?: string
    query?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ items: KnowledgeDocumentView[]; total: number }> {
    assertPermission(ctx, "read")
    const where: Record<string, unknown> = { storeId: ctx.storeId }
    if (filters.status && KNOWLEDGE_STATUSES.includes(filters.status as never)) where.status = filters.status
    if (filters.type && KNOWLEDGE_DOCUMENT_TYPES.includes(filters.type as never)) where.type = filters.type
    if (filters.authorId) where.authorId = filters.authorId
    const AND: Array<Record<string, unknown>> = []
    if (filters.categoryId) AND.push({ categories: { some: { categoryId: filters.categoryId } } })
    if (filters.tagId) AND.push({ tags: { some: { tagId: filters.tagId } } })
    if (filters.query) AND.push({
      OR: [
        { title: { contains: filters.query, mode: "insensitive" as const } },
        { content: { contains: filters.query, mode: "insensitive" as const } },
      ],
    })
    if (AND.length > 0) where.AND = AND

    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const offset = Math.max(filters.offset ?? 0, 0)
    const [rows, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          author: { select: { name: true } },
          categories: { include: { category: { select: { id: true, name: true, slug: true, color: true } } } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ])
    return {
      items: rows.map((row) => toView({
        id: row.id,
        storeId: row.storeId,
        title: row.title,
        content: row.content,
        summary: row.summary,
        type: row.type,
        source: row.source,
        status: row.status,
        fileName: row.fileName,
        fileUrl: row.fileUrl,
        fileType: row.fileType,
        fileSize: row.fileSize,
        version: row.version,
        viewCount: row.viewCount,
        authorId: row.authorId,
        authorName: row.author?.name ?? null,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        categories: row.categories.map((jc) => ({ id: jc.category.id, name: jc.category.name, slug: jc.category.slug, color: jc.category.color ?? null })),
        tags: row.tags.map((jt) => ({ id: jt.tag.id, name: jt.tag.name, slug: jt.tag.slug })),
      })),
      total,
    }
  }

  async updateDocument(ctx: StoreServiceContext, documentId: string, input: UpdateKnowledgeDocumentInput): Promise<KnowledgeDocumentView> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")

    const categoryIds = input.categoryIds ?? []
    const tagIds = input.tagIds ?? []
    await this.validateLinks(ctx, categoryIds, tagIds)

    const title = input.title?.trim() || existing.title
    const content = input.content !== undefined ? input.content.trim() : existing.content
    if (!content && !existing.fileName) throw serviceError("El documento necesita contenido o un archivo", 400, "KNOWLEDGE_EMPTY_DOCUMENT")
    if (tokenCount(content) > 200_000) throw serviceError("El documento es demasiado grande para indexarlo", 400, "KNOWLEDGE_TOO_LARGE")

    const status = input.status !== undefined && KNOWLEDGE_STATUSES.includes(input.status as never) ? input.status : existing.status
    const type = input.type !== undefined && KNOWLEDGE_DOCUMENT_TYPES.includes(input.type as KnowledgeDocumentType) ? input.type : existing.type

    const changed =
      title !== existing.title ||
      content !== existing.content ||
      status !== existing.status ||
      type !== existing.type ||
      input.summary !== undefined ||
      categoryIds.length > 0 ||
      tagIds.length > 0

    if (!changed) return this.requireDocument(ctx, documentId)

    // Snapshot de la versión anterior antes de actualizar.
    await this.prisma.knowledgeVersion.create({
      data: {
        documentId: existing.id,
        version: existing.version,
        title: existing.title,
        content: existing.content,
        summary: existing.summary,
        fileName: existing.fileName,
        fileUrl: existing.fileUrl,
        changeNote: input.changeNote ?? null,
        authorId: ctx.userId,
      },
    })

    const nextVersion = existing.version + 1
    const wasPublished = existing.status === "published"
    const publishedAt = !wasPublished && status === "published" ? new Date() : existing.publishedAt

    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: {
        title,
        content,
        ...(input.summary !== undefined ? { summary: input.summary?.trim() || null } : {}),
        type,
        status,
        version: nextVersion,
        publishedAt,
        categories: { deleteMany: {}, create: categoryIds.map((categoryId) => ({ categoryId })) },
        tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
      },
    })

    const categories = categoryIds.length > 0
      ? await this.prisma.knowledgeCategory.findMany({ where: { id: { in: categoryIds } }, select: { name: true } })
      : []
    const tags = tagIds.length > 0
      ? await this.prisma.knowledgeTag.findMany({ where: { id: { in: tagIds } }, select: { name: true } })
      : []
    await this.reindex(ctx, documentId, nextVersion, {
      title,
      content,
      type,
      status,
      fileName: existing.fileName,
      fileUrl: existing.fileUrl,
      fileType: existing.fileType,
      fileSize: existing.fileSize,
      categoryNames: categories.map((c) => c.name),
      tagNames: tags.map((t) => t.name),
    })

    await this.addHistory(ctx, { documentId, action: "updated", title, metadata: { fromVersion: existing.version, toVersion: nextVersion, changeNote: input.changeNote } })
    await this.addHistory(ctx, { documentId, action: "indexed", title, metadata: { version: nextVersion } })
    this.fireEvent({ ctx, type: "knowledge.document.updated", documentId, title })
    this.fireEvent({ ctx, type: "knowledge.document.indexed", documentId, title })

    return this.requireDocument(ctx, documentId)
  }

  /** Estado archivado (borrado lógico). */
  async archiveDocument(ctx: StoreServiceContext, documentId: string): Promise<void> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    await this.prisma.knowledgeDocument.update({ where: { id: documentId }, data: { status: "archived", publishedAt: null } })
    await this.addHistory(ctx, { documentId, action: "updated", title: existing.title, metadata: { status: "archived" } })
    this.fireEvent({ ctx, type: "knowledge.document.updated", documentId, title: existing.title })
  }

  /** Eliminación definitiva (auditada). */
  async deleteDocument(ctx: StoreServiceContext, documentId: string): Promise<void> {
    assertPermission(ctx, "manage")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    await this.addHistory(ctx, { documentId, action: "deleted", title: existing.title, metadata: { version: existing.version } })
    await this.prisma.knowledgeDocument.delete({ where: { id: documentId } })
    this.fireEvent({ ctx, type: "knowledge.document.deleted", documentId, title: existing.title })
  }

  /** Restaura el contenido de una versión anterior (crea versión nueva). */
  async restoreVersion(ctx: StoreServiceContext, documentId: string, version: number): Promise<KnowledgeDocumentView> {
    assertPermission(ctx, "write")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    const snapshot = await this.prisma.knowledgeVersion.findUnique({
      where: { documentId_version: { documentId, version } },
    })
    if (!snapshot) throw serviceError("Versión no encontrada", 404, "KNOWLEDGE_VERSION_NOT_FOUND")
    return this.updateDocument(ctx, documentId, {
      title: snapshot.title,
      content: snapshot.content,
      summary: snapshot.summary,
      changeNote: `Restaurada la versión ${version}`,
    })
  }

  // ── Versiones ────────────────────────────────────────────────────────────

  async listVersions(ctx: StoreServiceContext, documentId: string): Promise<Array<{
    id: string
    version: number
    title: string
    changeNote: string | null
    authorId: string | null
    createdAt: string
  }>> {
    assertPermission(ctx, "read")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    const versions = await this.prisma.knowledgeVersion.findMany({
      where: { documentId },
      orderBy: { version: "desc" },
    })
    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      title: v.title,
      changeNote: v.changeNote,
      authorId: v.authorId,
      createdAt: v.createdAt.toISOString(),
    }))
  }

  // ── Vistas / historial ───────────────────────────────────────────────────

  /** Registra una vista (incrementa viewCount) — auditada en historial. */
  async recordView(ctx: StoreServiceContext, documentId: string): Promise<void> {
    assertPermission(ctx, "read")
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id: documentId, storeId: ctx.storeId } })
    if (!existing) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
    await this.prisma.knowledgeDocument.update({ where: { id: documentId }, data: { viewCount: { increment: 1 } } })
    await this.addHistory(ctx, { documentId, action: "viewed", title: existing.title })
  }

  async listHistory(ctx: StoreServiceContext, filters: { documentId?: string; limit?: number } = {}): Promise<Array<{
    id: string
    documentId: string | null
    action: string
    title: string | null
    userId: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
  }>> {
    assertPermission(ctx, "read")
    const where: Record<string, unknown> = { storeId: ctx.storeId }
    if (filters.documentId) {
      const doc = await this.prisma.knowledgeDocument.findFirst({ where: { id: filters.documentId, storeId: ctx.storeId }, select: { id: true } })
      if (!doc) throw serviceError("Documento no encontrado", 404, "KNOWLEDGE_DOCUMENT_NOT_FOUND")
      where.documentId = filters.documentId
    }
    const rows = await this.prisma.knowledgeHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(filters.limit ?? 50, 1), 200),
    })
    return rows.map((h) => ({
      id: h.id,
      documentId: h.documentId,
      action: h.action,
      title: h.title,
      userId: h.userId,
      metadata: parseJson(h.metadata),
      createdAt: h.createdAt.toISOString(),
    }))
  }

  // ── Búsqueda híbrida ─────────────────────────────────────────────────────

  async search(ctx: StoreServiceContext, filters: KnowledgeSearchFilters): Promise<{
    hits: Array<{ document: KnowledgeDocumentView; score: number; matchedOn: string[]; snippet: string | null }>
    total: number
  }> {
    assertPermission(ctx, "read")
    const engine = new KnowledgeSearchEngine(createPrismaKnowledgeSearchStore(this.prisma))
    const result = await engine.search(ctx.storeId, filters)
    this.fireEvent({
      ctx,
      type: "knowledge.search.executed",
      query: filters.query,
      hits: result.hits.length,
    })
    return {
      hits: result.hits.map((h) => ({
        document: h.document,
        score: h.score,
        matchedOn: h.matchedOn,
        snippet: h.snippet ?? buildSnippet(h.document.content, filters.query ?? ""),
      })),
      total: result.total,
    }
  }
}

export { KNOWLEDGE_EVENT_DOMAIN, KNOWLEDGE_EVENTS }
