import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type ProductListFilters = {
  storeId: string
  q?: string
  category?: string
  sort?: "name" | "price" | "stock" | "createdAt"
  order?: "asc" | "desc"
  skip?: number
  take?: number
}

export type ProductPricing = {
  id: string
  stock: number
  name: string
  price: number
  costPrice: number | null
  isWholesale: boolean
  wholesalePrice: number | null
  wholesaleScales: string | null
}

export class ProductRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient = prisma) {}

  findById(id: string) {
    return this.db.product.findUnique({ where: { id } })
  }

  findByIdWithCategory(id: string) {
    return this.db.product.findUnique({
      where: { id },
      include: { category: true },
    })
  }

  findByIds(ids: string[], storeId?: string): Promise<ProductPricing[]> {
    return this.db.product.findMany({
      where: { id: { in: ids }, ...(storeId ? { storeId } : {}) },
      select: {
        id: true,
        stock: true,
        name: true,
        price: true,
        costPrice: true,
        isWholesale: true,
        wholesalePrice: true,
        wholesaleScales: true,
      },
    })
  }

  private buildWhere(filters: ProductListFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { storeId: filters.storeId }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { sku: { contains: filters.q, mode: "insensitive" } },
        { barcode: { contains: filters.q, mode: "insensitive" } },
      ]
    }
    if (filters.category) where.categoryId = filters.category
    return where
  }

  async list(filters: ProductListFilters) {
    const where = this.buildWhere(filters)
    const orderBy = filters.sort
      ? ({ [filters.sort]: filters.order ?? "asc" } as Prisma.ProductOrderByWithRelationInput)
      : { createdAt: "desc" as const }
    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: filters.skip,
        take: filters.take,
      }),
      this.db.product.count({ where }),
    ])
    return { products, total }
  }

  countByStore(storeId: string) {
    return this.db.product.count({ where: { storeId } })
  }

  /** Métricas exactas de inventario para la vista de gestión (productos activos). */
  async metrics(storeId: string) {
    const [total, lowStock, outOfStock, valueRows] = await Promise.all([
      this.db.product.count({ where: { storeId, isActive: true } }),
      this.db.product.count({ where: { storeId, isActive: true, stock: { lte: 5 } } }),
      this.db.product.count({ where: { storeId, isActive: true, stock: 0 } }),
      this.db.$queryRaw<Array<{ value: number | null }>>(Prisma.sql`
        SELECT COALESCE(SUM(price * stock), 0) AS value
        FROM "Product"
        WHERE "storeId" = ${storeId} AND "isActive" = true
      `),
    ])
    return {
      total,
      lowStock,
      outOfStock,
      inventoryValue: valueRows[0]?.value ?? 0,
    }
  }

  countByStoreCategory(storeId: string, category: string) {
    return this.db.product.count({ where: { storeId, categoryId: category } })
  }

  create(data: Prisma.ProductUncheckedCreateInput) {
    return this.db.product.create({ data })
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.db.product.update({ where: { id }, data })
  }

  delete(id: string) {
    return this.db.product.delete({ where: { id } })
  }

  decrementStock(id: string, quantity: number) {
    return this.db.product.update({
      where: { id },
      data: { stock: { decrement: quantity } },
    })
  }

  incrementStock(id: string, quantity: number) {
    return this.db.product.update({
      where: { id },
      data: { stock: { increment: quantity } },
    })
  }

  setStock(id: string, stock: number) {
    return this.db.product.update({
      where: { id },
      data: { stock },
    })
  }

  deleteDigitalProduct(productId: string) {
    return this.db.digitalProduct.deleteMany({ where: { productId } })
  }

  upsertDigitalProduct(productId: string, data: Prisma.DigitalProductUncheckedCreateWithoutProductInput) {
    return this.db.digitalProduct.upsert({
      where: { productId },
      create: { ...data, productId },
      update: data,
    })
  }
}
