import { prisma } from "@/lib/prisma"
import { PUBLIC_ROUTES, SEOPages } from "@/lib/seo/constants"
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog/posts"

// ============================================================
//  SITEMAP — Panitas.app
//  Generación dinámica con prioridades SEO, validación, y
//  soporte futuro para landing pages de contenido.
//
//  Prioridades:
//  1.0  → Landing principal
//  0.9  → Páginas comerciales (Pricing)
//  0.8  → Tiendas públicas activas
//  0.7  → Páginas de ayuda / FAQ / Booking
//  0.6  → Contacto
//  0.5  → Páginas de contenido informativo
//  0.4  → Páginas legales (Términos, Privacidad)
// ============================================================

type Changefreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"

interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: Changefreq
  priority: number
}

/**
 * URLs bloqueadas en robots.txt que NUNCA deben aparecer en sitemap.
 */
const BLOCKED_PREFIXES = [
  "/dashboard/",
  "/admin/",
  "/onboarding/",
  "/seller/",
  "/perfil/",
  "/login",
  "/register",
  "/join",
  "/choose-plan",
  "/subscribe",
  "/restablecer",
  "/recuperar",
  "/api/",
]

function isBlocked(path: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))
}

export default async function sitemap(): Promise<SitemapEntry[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://panitas.app"
  const entries: SitemapEntry[] = []
  const today = new Date()

  // ───────────────────────────────────────
  //  1. Páginas públicas estáticas
  // ───────────────────────────────────────
  for (const route of PUBLIC_ROUTES) {
    if (isBlocked(route.path)) continue

    entries.push({
      url: `${baseUrl}${route.path}`,
      lastModified: today,
      changeFrequency: route.changefreq as Changefreq,
      priority: route.priority,
    })
  }

  // ───────────────────────────────────────
  //  2. Páginas SEO de contenido
  // ───────────────────────────────────────
  for (const page of SEOPages) {
    entries.push({
      url: `${baseUrl}${page.route}`,
      lastModified: today,
      changeFrequency: page.changefreq as Changefreq,
      priority: page.priority,
    })
  }

  // ───────────────────────────────────────
  //  3. Blog
  // ───────────────────────────────────────
  entries.push({
    url: `${baseUrl}/blog`,
    lastModified: today,
    changeFrequency: "weekly",
    priority: 0.6,
  })

  for (const cat of BLOG_CATEGORIES) {
    entries.push({
      url: `${baseUrl}/blog/${cat.slug}`,
      lastModified: today,
      changeFrequency: "weekly",
      priority: 0.5,
    })
  }

  for (const post of BLOG_POSTS) {
    entries.push({
      url: `${baseUrl}/blog/${post.categorySlug}/${post.slug}`,
      lastModified: new Date(post.dateModified),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  }

  // ───────────────────────────────────────
  //  4. Tiendas públicas activas
  // ───────────────────────────────────────
  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
        planStatus: { in: ["active", "activo", "trial"] },
        name: { not: "" },
      },
      select: {
        slug: true,
        updatedAt: true,
        planType: true,
        name: true,
      },
      orderBy: { updatedAt: "desc" },
    })

    for (const store of stores) {
      entries.push({
        url: `${baseUrl}/${store.slug}`,
        lastModified: store.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })

      // Agregar booking solo si el plan tiene agenda
      if (store.planType === "agenda" || store.planType === "reservas") {
        entries.push({
          url: `${baseUrl}/${store.slug}/booking`,
          lastModified: store.updatedAt,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }
    }
  } catch (e) {
    console.error("[sitemap] Error fetching stores:", e)
  }

  // ───────────────────────────────────────
  //  4. Perfiles públicos NO incluidos
  //     Actualmente /perfil/[id] redirige 301
  //     a /store/[slug]. No tiene sentido
  //     incluirlos hasta que exista una URL
  //     amigable tipo /profesional/nombre.
  // ───────────────────────────────────────

  // ───────────────────────────────────────
  //  Validación final: eliminar URLs
  //  bloqueadas en robots.txt
  // ───────────────────────────────────────
  return entries.filter((entry) => {
    const path = new URL(entry.url).pathname
    if (isBlocked(path)) {
      console.warn(`[sitemap] Removed blocked URL: ${entry.url}`)
      return false
    }
    return true
  })
}