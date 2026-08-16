import { PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export class CategoryRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findById(storeId: string, id: string) {
    return this.db.category.findFirst({ where: { storeId, id } })
  }

  findBySlug(storeId: string, slug: string) {
    return this.db.category.findUnique({
      where: { storeId_slug: { storeId, slug } },
    })
  }

  list(storeId: string) {
    return this.db.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
    })
  }

  create(data: { storeId: string; name: string; slug: string }) {
    return this.db.category.create({ data })
  }
}
