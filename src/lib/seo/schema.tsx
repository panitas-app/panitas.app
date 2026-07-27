import { BASE_URL, SITE_NAME, SITE_DESCRIPTION } from "./constants"
import type { BlogPost } from "@/lib/blog/posts"

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo-square.svg`,
    image: `${BASE_URL}/og-image.jpg`,
    description: SITE_DESCRIPTION,
    email: "supportpanitas@gmail.com",
    telephone: "+58-424-1234567",
    sameAs: [
      "https://www.instagram.com/panitas.app",
      "https://twitter.com/panitasapp",
      "https://www.facebook.com/panitas.app",
      "https://www.linkedin.com/company/panitas",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "VE",
      addressLocality: "Caracas",
      addressRegion: "Distrito Capital",
    },
    founder: { "@type": "Person", name: "Diego Suárez" },
    areaServed: [
      { "@type": "Country", name: "Venezuela" },
      { "@type": "Country", name: "Colombia" },
      { "@type": "Country", name: "Ecuador" },
      { "@type": "Country", name: "Perú" },
    ],
    makesOffer: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Software Administrativo para Negocios",
          description: "Plataforma todo-en-uno para gestión de negocios: tienda online, agenda, CRM, POS y control B2B.",
        },
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "supportpanitas@gmail.com",
      contactType: "customer service",
      availableLanguage: "Spanish",
    },
    knowsAbout: [
      "software administrativo Venezuela",
      "punto de venta Venezuela",
      "gestión de inventario",
      "agenda online",
      "pago móvil Venezuela",
      "tienda online Venezuela",
      "software para negocios",
      "sistema de facturación Venezuela",
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${BASE_URL}/#software`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web (any browser)",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "15",
      highPrice: "45",
      offerCount: "3",
      offers: [
        {
          "@type": "Offer",
          name: "Plan Agenda",
          price: "15",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "15",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
        {
          "@type": "Offer",
          name: "Plan Emprendedor",
          price: "25",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "25",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
        {
          "@type": "Offer",
          name: "Plan Mayorista",
          price: "45",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "45",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
      ],
    },
    inLanguage: "es",
    countryOfOrigin: "VE",
    screenshot: `${BASE_URL}/og-image.jpg`,
    featureList: [
      "Tienda online profesional con catálogo de productos",
      "Agenda de citas con reservas online",
      "CRM con gestión de clientes y seguimiento",
      "Punto de venta (POS) integrado",
      "Control B2B para mayoristas",
      "Reportes y analytics de ventas",
      "Gestión de comisiones para vendedores",
      "Tasa BCV actualizada automáticamente",
      "Múltiples plantillas de tienda",
      "Notificaciones automáticas por email",
    ],
    softwareVersion: "1.0",
    applicationSuite: "Panitas",
    downloadUrl: BASE_URL,
    installUrl: BASE_URL,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "150",
      reviewCount: "85",
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "es-VE",
    publisher: { "@id": `${BASE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/store/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareCompany",
    "@id": `${BASE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: BASE_URL,
    description: SITE_DESCRIPTION,
    email: "supportpanitas@gmail.com",
    address: {
      "@type": "PostalAddress",
      addressCountry: "VE",
      addressLocality: "Caracas",
      addressRegion: "Distrito Capital",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 10.4806,
      longitude: -66.9036,
    },
    areaServed: {
      "@type": "Country",
      name: "Venezuela",
    },
    priceRange: "$15 - $45",
    openingHours: "Mo-Fr 09:00-18:00",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "150",
      reviewCount: "85",
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function WebPageSchema({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}${path}/#webpage`,
    url: `${BASE_URL}${path}`,
    name: title,
    description,
    inLanguage: "es-VE",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: { "@id": `${BASE_URL}/#organization` },
    dateModified: new Date().toISOString(),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function BreadcrumbSchema({ items }: { items: { name: string; path: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function CollectionPageSchema({
  title,
  description,
  path,
  itemCount,
}: {
  title: string
  description: string
  path: string
  itemCount?: number
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE_URL}${path}/#collection`,
    url: `${BASE_URL}${path}`,
    name: title,
    description,
    inLanguage: "es-VE",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: { "@id": `${BASE_URL}/#organization` },
    mainEntity: { "@type": "ItemList", numberOfItems: itemCount || 0 },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function ProductSchema({
  name,
  description,
  price,
  currency = "USD",
  image,
  url,
  availability = "https://schema.org/InStock",
  brand,
}: {
  name: string
  description: string
  price: string
  currency?: string
  image?: string
  url: string
  availability?: string
  brand?: string
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability,
      url,
    },
  }
  if (image) schema.image = image
  if (brand) schema.brand = { "@type": "Brand", name: brand }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function FaqPageSchema({ questions }: { questions: { question: string; answer: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function ReviewSchema({
  reviews,
  ratingValue = "4.8",
  reviewCount = "85",
}: {
  reviews: { author: string; rating: number; text: string; date: string }[]
  ratingValue?: string
  reviewCount?: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Panitas – Software Administrativo",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: "5",
      worstRating: "1",
      reviewCount,
    },
    review: reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: "5",
      },
      reviewBody: r.text,
      datePublished: r.date,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function ArticleSchema({ post }: { post: BlogPost }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    image: `${BASE_URL}${post.image}`,
    datePublished: post.date,
    dateModified: post.dateModified,
    author: {
      "@type": "Organization",
      name: post.author,
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo-square.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${post.categorySlug}/${post.slug}`,
    },
    url: `${BASE_URL}/blog/${post.categorySlug}/${post.slug}`,
    inLanguage: "es",
    about: {
      "@type": "Thing",
      name: post.category,
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export function PricingOfferSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Panitas – Planes y Precios",
    url: `${BASE_URL}/pricing`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Offer",
            name: "Plan Agenda",
            description: "Software de agenda online para profesionales con reservas, recordatorios y calendario.",
            price: "15",
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "15",
              priceCurrency: "USD",
              billingDuration: "P1M",
            },
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "Offer",
            name: "Plan Emprendedor",
            description: "Software administrativo con inventario, ventas, tienda online, CRM y agenda.",
            price: "25",
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "25",
              priceCurrency: "USD",
              billingDuration: "P1M",
            },
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "Offer",
            name: "Plan Mayorista",
            description: "Sistema administrativo completo para distribuidoras y mayoristas con B2B.",
            price: "45",
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "45",
              priceCurrency: "USD",
              billingDuration: "P1M",
            },
            availability: "https://schema.org/InStock",
            url: `${BASE_URL}/pricing`,
          },
        },
      ],
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}
