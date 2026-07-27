import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-medicos"].title,
  description: PAGE_META["/software-para-medicos"].description,
  alternates: { canonical: "/software-para-medicos" },
  openGraph: {
    title: PAGE_META["/software-para-medicos"].title,
    description: PAGE_META["/software-para-medicos"].description,
    url: "/software-para-medicos",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-medicos"].title,
    description: PAGE_META["/software-para-medicos"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-medicos" />
}