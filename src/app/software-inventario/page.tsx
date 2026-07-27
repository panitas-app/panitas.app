import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-inventario"].title,
  description: PAGE_META["/software-inventario"].description,
  alternates: { canonical: "/software-inventario" },
  openGraph: {
    title: PAGE_META["/software-inventario"].title,
    description: PAGE_META["/software-inventario"].description,
    url: "/software-inventario",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-inventario"].title,
    description: PAGE_META["/software-inventario"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-inventario" />
}