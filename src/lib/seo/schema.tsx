import { BASE_URL, SITE_NAME, SITE_DESCRIPTION } from "./constants"

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logonuevo.png`,
    description: SITE_DESCRIPTION,
    email: "supportpanitas@gmail.com",
    sameAs: [
      "https://www.instagram.com/panitas.app",
      "https://twitter.com/panitasapp",
    ],
    address: { "@type": "PostalAddress", addressCountry: "VE" },
    founder: { "@type": "Person", name: "Diego Suárez" },
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
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "15",
      highPrice: "45",
      offerCount: "3",
      offers: [
        { "@type": "Offer", name: "Agenda", price: "15", priceCurrency: "USD" },
        { "@type": "Offer", name: "Emprendedor", price: "25", priceCurrency: "USD" },
        { "@type": "Offer", name: "Mayorista", price: "45", priceCurrency: "USD" },
      ],
    },
    inLanguage: "es",
    countryOfOrigin: "VE",
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
