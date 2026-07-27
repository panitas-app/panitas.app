import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/agenda-online"].title,
  description: PAGE_META["/agenda-online"].description,
  alternates: { canonical: "/agenda-online" },
  openGraph: {
    title: PAGE_META["/agenda-online"].title,
    description: PAGE_META["/agenda-online"].description,
    url: "/agenda-online",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/agenda-online"].title,
    description: PAGE_META["/agenda-online"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/agenda-online" />
}