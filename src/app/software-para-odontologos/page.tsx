import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-odontologos"].title,
  description: PAGE_META["/software-para-odontologos"].description,
  alternates: { canonical: "/software-para-odontologos" },
  openGraph: {
    title: PAGE_META["/software-para-odontologos"].title,
    description: PAGE_META["/software-para-odontologos"].description,
    url: "/software-para-odontologos",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-odontologos"].title,
    description: PAGE_META["/software-para-odontologos"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-odontologos" />
}