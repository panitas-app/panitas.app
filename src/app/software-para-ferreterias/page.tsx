import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-ferreterias"].title,
  description: PAGE_META["/software-para-ferreterias"].description,
  alternates: { canonical: "/software-para-ferreterias" },
  openGraph: {
    title: PAGE_META["/software-para-ferreterias"].title,
    description: PAGE_META["/software-para-ferreterias"].description,
    url: "/software-para-ferreterias",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-ferreterias"].title,
    description: PAGE_META["/software-para-ferreterias"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-ferreterias" />
}