import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getEffectiveRate } from "@/lib/bcv"
import { getCachedStoreBySlug } from "@/lib/data-cache"
import StoreContentClient from "@/components/store/store-content-client"
import StorePlaceholder from "@/components/store/store-placeholder"
import AgendaProfile from "@/components/store/agenda-profile"
import { VisitTracker } from "@/components/store/visit-tracker"

function parseImages(value: string): string[] {
  try { return JSON.parse(value) } catch { return [] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const store = await getCachedStoreBySlug(slug)

  if (!store) {
    return {
      title: "Perfil No Encontrado | Panitas",
      description: "El perfil que buscas no existe o ha sido desactivado temporalmente.",
      robots: { index: false, follow: false },
    }
  }

  if (store.planStatus !== "active" && store.planStatus !== "trial" && store.planStatus !== "activo") {
    return {
      title: `${store.name} | Panitas`,
      description: store.description || `Perfil de ${store.name} en Panitas.`,
      robots: { index: false, follow: false },
    }
  }

  const isAgenda = store.planType === "agenda" || store.planType === "reservas"

  if (isAgenda) {
    return {
      title: `${store.name} | Reserva tu cita`,
      description: store.description || `Agenda una cita con ${store.name} a través de Panitas.`,
      metadataBase: new URL("https://panitas.app"),
      alternates: { canonical: `/store/${slug}` },
      openGraph: {
        title: `${store.name} | Panitas`,
        description: store.description || `Reserva tu cita con ${store.name}.`,
        images: store.logo ? [{ url: store.logo, width: 800, height: 600, alt: store.name }] : [],
        type: "profile",
        siteName: "Panitas",
        locale: "es_VE",
      },
      twitter: {
        card: "summary_large_image",
        title: `${store.name} | Panitas`,
        description: store.description || `Reserva tu cita con ${store.name}.`,
        images: store.logo ? [store.logo] : [],
      },
      robots: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
      other: {
        "og:locale": "es_VE",
      },
    }
  }

  return {
    title: `${store.name} | Panitas`,
    description: store.description || `Compra en la tienda oficial de ${store.name} en Panitas. Catálogo de productos con tasa oficial BCV y pago coordinado en Venezuela.`,
    metadataBase: new URL("https://panitas.app"),
    alternates: { canonical: `/store/${slug}` },
    openGraph: {
      title: `${store.name} | Panitas`,
      description: store.description || `Visita el catálogo en línea de ${store.name}.`,
      images: store.logo ? [{ url: store.logo, width: 800, height: 600, alt: store.name }] : [],
      type: "website",
      siteName: "Panitas",
      locale: "es_VE",
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.name} | Panitas`,
      description: store.description || `Visita el catálogo en línea de ${store.name}.`,
      images: store.logo ? [store.logo] : [],
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
    other: {
      "og:locale": "es_VE",
    },
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const store = await getCachedStoreBySlug(slug)
  if (!store) { notFound() }

  if (store.planStatus !== "active" && store.planStatus !== "trial" && store.planStatus !== "activo") {
    return <StorePlaceholder store={store} />
  }

  const isAgenda = store.planType === "agenda" || store.planType === "reservas"

  if (isAgenda) {
    return (
      <>
        <VisitTracker storeId={store.id} />
        <AgendaProfile slug={slug} />
      </>
    )
  }

  const bcvRate = await getEffectiveRate()

  const canBook = store.negocioId
    ? await prisma.negocio.findUnique({
        where: { id: store.negocioId },
        select: { planId: true, modalidad: true },
      }).then(async (n) => {
        if (!n) return false
        const modalidadIsAgenda = n.modalidad === "agenda"
        const hasServices = await prisma.service.count({
          where: { negocioId: store.negocioId!, isActive: true },
        })
        return modalidadIsAgenda || hasServices > 0
      })
    : false

  const products = store.products.map((p) => ({
    ...p,
    images: parseImages(p.images),
  }))

  const storeData = {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    logo: store.logo,
    banner: store.banner,
    phone: store.phone,
    whatsapp: store.whatsapp,
    address: store.address,
    storeHours: store.storeHours,
    template: store.template || "modern",
    primaryColor: store.primaryColor,
    categories: store.categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    plan: store.plan,
    planType: store.planType || store.plan,
    instagram: store.instagram,
    facebook: store.facebook,
    tiktok: store.tiktok,
    twitter: store.twitter,
    youtube: store.youtube,
    linkedin: store.linkedin,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      images: p.images,
      stock: p.stock,
      category: p.category ? {
        id: p.category.id,
        name: p.category.name,
        slug: p.category.slug,
      } : null,
    })),
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || undefined,
    image: store.logo || undefined,
    url: `https://panitas.app/store/${slug}`,
    telephone: store.phone || store.whatsapp || undefined,
    address: store.address ? {
      "@type": "PostalAddress",
      streetAddress: store.address,
      addressLocality: undefined,
      addressRegion: undefined,
      addressCountry: "VE",
    } : undefined,
    ...(storeData.products.length > 0 ? {
      makesOffer: storeData.products.slice(0, 20).map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: p.price,
        priceCurrency: "USD",
        availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      })),
    } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <VisitTracker storeId={store.id} />
      <StoreContentClient
        store={storeData}
        products={storeData.products}
        bcvRate={bcvRate}
        slug={slug}
        canBook={canBook}
      />
    </>
  )
}
