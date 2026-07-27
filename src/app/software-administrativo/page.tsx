import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-administrativo"].title,
  description: PAGE_META["/software-administrativo"].description,
  alternates: { canonical: "/software-administrativo" },
  openGraph: {
    title: PAGE_META["/software-administrativo"].title,
    description: PAGE_META["/software-administrativo"].description,
    url: "/software-administrativo",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-administrativo"].title,
    description: PAGE_META["/software-administrativo"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-administrativo" />
}