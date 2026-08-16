import { Prisma } from "@prisma/client"
import { safeStr } from "@/lib/validate"
import { slugify } from "@/lib/utils"
import { serviceError } from "@/services/errors"
import { CategoryRepository } from "@/repositories/category.repository"
import type { StoreServiceContext } from "@/services/context"

const MAX_CATEGORY_NAME = 100

export class CategoryService {
  constructor(private readonly repo = new CategoryRepository()) {}

  list(ctx: StoreServiceContext) {
    return this.repo.list(ctx.storeId)
  }

  /**
   * Crea una categoría (idempotente por negocio + slug): si ya existe una con el
   * mismo nombre devuelve la existente, igual que la API de categorías.
   */
  async create(ctx: StoreServiceContext, body: Record<string, unknown>) {
    const raw = safeStr(body.name, MAX_CATEGORY_NAME)
    if (!raw || !raw.trim()) throw serviceError("El nombre de la categoría es obligatorio", 400)

    const name = raw.trim()
    const slug = slugify(name)
    if (!slug) throw serviceError("El nombre no genera un slug válido", 400)

    const existing = await this.repo.findBySlug(ctx.storeId, slug)
    if (existing) return existing

    try {
      return await this.repo.create({ storeId: ctx.storeId, name, slug })
    } catch (error) {
      // Carrera: otra creación con el mismo slug ganó la unique. Devuelve la existente.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const dup = await this.repo.findBySlug(ctx.storeId, slug)
        if (dup) return dup
      }
      throw error
    }
  }

  /** true si la categoría existe y pertenece a este negocio (aislamiento). */
  async belongsToStore(ctx: StoreServiceContext, categoryId: string): Promise<boolean> {
    const category = await this.repo.findById(ctx.storeId, categoryId)
    return Boolean(category)
  }
}
