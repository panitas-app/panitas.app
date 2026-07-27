import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-negocios"].title,
  description: PAGE_META["/software-para-negocios"].description,
  alternates: { canonical: "/software-para-negocios" },
  openGraph: {
    title: PAGE_META["/software-para-negocios"].title,
    description: PAGE_META["/software-para-negocios"].description,
    url: "/software-para-negocios",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-negocios"].title,
    description: PAGE_META["/software-para-negocios"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-negocios" />
}