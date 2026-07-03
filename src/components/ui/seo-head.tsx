interface SeoHeadProps {
  storeName: string
  storeDescription?: string | null
  storeLogo?: string | null
  slug: string
  template?: string
}

export function SeoHead({ storeName, storeDescription, storeLogo, slug, template = "modern" }: SeoHeadProps) {
  const title = `${storeName} | Panitas`
  const description = storeDescription || `Compra en la tienda oficial de ${storeName} en Panitas. Catálogo de productos con tasa oficial BCV y pago coordinado en Venezuela.`
  const url = `https://panitas.app/store/${slug}`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storeName,
    description: storeDescription || undefined,
    image: storeLogo || undefined,
    url,
    inLanguage: "es-VE",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  }

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Panitas" />
      <meta property="og:locale" content="es_VE" />
      {storeLogo && <meta property="og:image" content={storeLogo} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {storeLogo && <meta name="twitter:image" content={storeLogo} />}

      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
