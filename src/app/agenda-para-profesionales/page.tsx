import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/agenda-para-profesionales"].title,
  description: PAGE_META["/agenda-para-profesionales"].description,
  alternates: { canonical: "/agenda-para-profesionales" },
  openGraph: {
    title: PAGE_META["/agenda-para-profesionales"].title,
    description: PAGE_META["/agenda-para-profesionales"].description,
    url: "/agenda-para-profesionales",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/agenda-para-profesionales"].title,
    description: PAGE_META["/agenda-para-profesionales"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/agenda-para-profesionales" />
}