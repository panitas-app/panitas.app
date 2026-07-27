import type { Metadata } from "next"
import SeoLandingPage from "@/components/seo/seo-landing-page"
import { PAGE_META } from "@/lib/seo/constants"

export const metadata: Metadata = {
  title: PAGE_META["/software-para-salones-de-belleza"].title,
  description: PAGE_META["/software-para-salones-de-belleza"].description,
  alternates: { canonical: "/software-para-salones-de-belleza" },
  openGraph: {
    title: PAGE_META["/software-para-salones-de-belleza"].title,
    description: PAGE_META["/software-para-salones-de-belleza"].description,
    url: "/software-para-salones-de-belleza",
    siteName: "Panitas",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_META["/software-para-salones-de-belleza"].title,
    description: PAGE_META["/software-para-salones-de-belleza"].description,
  },
}

export default function Page() {
  return <SeoLandingPage route="/software-para-salones-de-belleza" />
}