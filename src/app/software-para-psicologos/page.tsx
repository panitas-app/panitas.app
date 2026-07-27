import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-psicologos"].title,
  description: PAGE_META["/software-para-psicologos"].description,
  alternates: { canonical: "/software-para-psicologos" },
  openGraph: {
    title: PAGE_META["/software-para-psicologos"].title,
    description: PAGE_META["/software-para-psicologos"].description,
    url: "/software-para-psicologos",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-psicologos"].title,
    description: PAGE_META["/software-para-psicologos"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-psicologos" />
}