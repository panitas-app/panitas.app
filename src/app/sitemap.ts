import { prisma } from "@/lib/prisma"
import { PUBLIC_ROUTES } from "@/lib/seo/constants"

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"

  const publicPages = PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changefreq as "weekly" | "monthly" | "yearly",
    priority: route.priority,
  }))

  let storePages: { url: string; lastModified: Date; changeFrequency: "weekly" | "monthly"; priority: number }[] = []
  let profilePages: { url: string; lastModified: Date; changeFrequency: "monthly"; priority: number }[] = []

  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true, planStatus: { in: ["active", "activo", "trial"] } },
      select: {
        slug: true,
        updatedAt: true,
        planType: true,
      },
    })

    storePages = stores.flatMap((s) => {
      const pages: { url: string; lastModified: Date; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
        {
          url: `${baseUrl}/store/${s.slug}`,
          lastModified: s.updatedAt,
          changeFrequency: "weekly",
          priority: 0.8,
        },
      ]

      if (s.planType === "agenda" || s.planType === "reservas") {
        pages.push({
          url: `${baseUrl}/store/${s.slug}/booking`,
          lastModified: s.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }

      return pages
    })
  } catch (e) {
    console.error("[sitemap] DB not available at build time, returning public pages only:", e)
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        store: { isActive: true, planStatus: { in: ["active", "activo", "trial"] } },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    })

    profilePages = users.map((u) => ({
      url: `${baseUrl}/perfil/${u.id}`,
      lastModified: u.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))
  } catch (e) {
    console.error("[sitemap] Could not fetch profile pages:", e)
  }

  return [...publicPages, ...storePages, ...profilePages]
}
