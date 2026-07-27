import type { Metadata } from "next"
import PlanLandingPage from "@/components/seo/plan-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/plan-agenda"].title,
  description: PAGE_META["/plan-agenda"].description,
  alternates: { canonical: "/plan-agenda" },
  openGraph: {
    title: PAGE_META["/plan-agenda"].title,
    description: PAGE_META["/plan-agenda"].description,
    url: "/plan-agenda",
    siteName: "Panitas",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/plan-agenda"].title,
    description: PAGE_META["/plan-agenda"].description,
  },
}

export default function Page() {
  return <PlanLandingPage plan="agenda" />
}
