import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/tienda-online"].title,
  description: PAGE_META["/tienda-online"].description,
  alternates: { canonical: "/tienda-online" },
  openGraph: {
    title: PAGE_META["/tienda-online"].title,
    description: PAGE_META["/tienda-online"].description,
    url: "/tienda-online",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/tienda-online"].title,
    description: PAGE_META["/tienda-online"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/tienda-online" />
}