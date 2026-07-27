import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-tiendas"].title,
  description: PAGE_META["/software-para-tiendas"].description,
  alternates: { canonical: "/software-para-tiendas" },
  openGraph: {
    title: PAGE_META["/software-para-tiendas"].title,
    description: PAGE_META["/software-para-tiendas"].description,
    url: "/software-para-tiendas",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-tiendas"].title,
    description: PAGE_META["/software-para-tiendas"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-tiendas" />
}