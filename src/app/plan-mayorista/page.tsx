import type { Metadata } from "next"
import PlanLandingPage from "@/components/seo/plan-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/plan-mayorista"].title,
  description: PAGE_META["/plan-mayorista"].description,
  alternates: { canonical: "/plan-mayorista" },
  openGraph: {
    title: PAGE_META["/plan-mayorista"].title,
    description: PAGE_META["/plan-mayorista"].description,
    url: "/plan-mayorista",
    siteName: "Panitas",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/plan-mayorista"].title,
    description: PAGE_META["/plan-mayorista"].description,
  },
}

export default function Page() {
  return <PlanLandingPage plan="mayorista" />
}
