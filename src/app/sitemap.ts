import { prisma } from "@/lib/prisma"

export default async function sitemap() {
  const baseUrl = "https://panitas.app"

  const stores = await prisma.store.findMany({
    where: { isActive: true, planStatus: { in: ["active", "activo"] } },
    select: { slug: true, updatedAt: true },
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...stores.map((s) => ({
      url: `${baseUrl}/store/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
