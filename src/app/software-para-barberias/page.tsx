import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-barberias"].title,
  description: PAGE_META["/software-para-barberias"].description,
  alternates: { canonical: "/software-para-barberias" },
  openGraph: {
    title: PAGE_META["/software-para-barberias"].title,
    description: PAGE_META["/software-para-barberias"].description,
    url: "/software-para-barberias",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-barberias"].title,
    description: PAGE_META["/software-para-barberias"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-barberias" />
}