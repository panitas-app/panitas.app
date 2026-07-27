import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/agenda-de-citas"].title,
  description: PAGE_META["/agenda-de-citas"].description,
  alternates: { canonical: "/agenda-de-citas" },
  openGraph: {
    title: PAGE_META["/agenda-de-citas"].title,
    description: PAGE_META["/agenda-de-citas"].description,
    url: "/agenda-de-citas",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/agenda-de-citas"].title,
    description: PAGE_META["/agenda-de-citas"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/agenda-de-citas" />
}