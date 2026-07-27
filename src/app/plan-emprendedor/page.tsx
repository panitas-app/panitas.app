import type { Metadata } from "next"
import PlanLandingPage from "@/components/seo/plan-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/plan-emprendedor"].title,
  description: PAGE_META["/plan-emprendedor"].description,
  alternates: { canonical: "/plan-emprendedor" },
  openGraph: {
    title: PAGE_META["/plan-emprendedor"].title,
    description: PAGE_META["/plan-emprendedor"].description,
    url: "/plan-emprendedor",
    siteName: "Panitas",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/plan-emprendedor"].title,
    description: PAGE_META["/plan-emprendedor"].description,
  },
}

export default function Page() {
  return <PlanLandingPage plan="emprendedor" />
}
