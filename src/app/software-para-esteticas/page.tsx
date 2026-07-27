import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-esteticas"].title,
  description: PAGE_META["/software-para-esteticas"].description,
  alternates: { canonical: "/software-para-esteticas" },
  openGraph: {
    title: PAGE_META["/software-para-esteticas"].title,
    description: PAGE_META["/software-para-esteticas"].description,
    url: "/software-para-esteticas",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-esteticas"].title,
    description: PAGE_META["/software-para-esteticas"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-esteticas" />
}