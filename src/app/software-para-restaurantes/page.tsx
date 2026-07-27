import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-restaurantes"].title,
  description: PAGE_META["/software-para-restaurantes"].description,
  alternates: { canonical: "/software-para-restaurantes" },
  openGraph: {
    title: PAGE_META["/software-para-restaurantes"].title,
    description: PAGE_META["/software-para-restaurantes"].description,
    url: "/software-para-restaurantes",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-restaurantes"].title,
    description: PAGE_META["/software-para-restaurantes"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-restaurantes" />
}