import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-peluquerias"].title,
  description: PAGE_META["/software-para-peluquerias"].description,
  alternates: { canonical: "/software-para-peluquerias" },
  openGraph: {
    title: PAGE_META["/software-para-peluquerias"].title,
    description: PAGE_META["/software-para-peluquerias"].description,
    url: "/software-para-peluquerias",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-peluquerias"].title,
    description: PAGE_META["/software-para-peluquerias"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-peluquerias" />
}