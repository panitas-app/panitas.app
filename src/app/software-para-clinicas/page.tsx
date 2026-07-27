import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-clinicas"].title,
  description: PAGE_META["/software-para-clinicas"].description,
  alternates: { canonical: "/software-para-clinicas" },
  openGraph: {
    title: PAGE_META["/software-para-clinicas"].title,
    description: PAGE_META["/software-para-clinicas"].description,
    url: "/software-para-clinicas",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-clinicas"].title,
    description: PAGE_META["/software-para-clinicas"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-clinicas" />
}