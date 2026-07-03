import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const getCachedStore = cache(async (storeId: string) => {
  return prisma.store.findUnique({ where: { id: storeId } })
})

export const getCachedStoreBySlug = cache(async (slug: string) => {
  return prisma.store.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: { orderBy: { order: "asc" } },
      products: { where: { isActive: true }, include: { category: true } },
      paymentAccounts: { where: { isActive: true } },
    },
  })
})

export const getCachedOrders = cache(async (storeId: string) => {
  return prisma.order.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  })
})

export const getCachedRecentOrders = cache(async (storeId: string, take = 5) => {
  return prisma.order.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    take,
  })
})

export const getCachedProductCount = cache(async (storeId: string) => {
  return prisma.product.count({ where: { storeId } })
})

export const getCachedOrderCount = cache(async (storeId: string) => {
  return prisma.order.count({ where: { storeId } })
})

export const getCachedCategories = cache(async (storeId: string) => {
  return prisma.category.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
  })
})
