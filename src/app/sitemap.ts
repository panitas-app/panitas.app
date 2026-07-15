import { prisma } from "@/lib/prisma"
import { PUBLIC_ROUTES } from "@/lib/seo/constants"

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"

  const stores = await prisma.store.findMany({
    where: { isActive: true, planStatus: { in: ["active", "activo"] } },
    select: { slug: true, updatedAt: true },
  })

  const publicPages = PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changefreq as "weekly" | "monthly" | "yearly",
    priority: route.priority,
  }))

  const storePages = stores.map((s) => ({
    url: `${baseUrl}/store/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [...publicPages, ...storePages]
}
