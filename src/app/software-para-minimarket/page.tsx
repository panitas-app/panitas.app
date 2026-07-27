import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-minimarket"].title,
  description: PAGE_META["/software-para-minimarket"].description,
  alternates: { canonical: "/software-para-minimarket" },
  openGraph: {
    title: PAGE_META["/software-para-minimarket"].title,
    description: PAGE_META["/software-para-minimarket"].description,
    url: "/software-para-minimarket",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-minimarket"].title,
    description: PAGE_META["/software-para-minimarket"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-minimarket" />
}