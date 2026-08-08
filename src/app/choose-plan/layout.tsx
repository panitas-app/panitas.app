import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/choose-plan"].title,
  description: PAGE_META["/choose-plan"].description,
  robots: { index: false, follow: true },
  alternates: { canonical: "/choose-plan" },
  openGraph: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
  twitter: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
}

export default async function ChoosePlanLayout({ children }: { children: React.ReactNode }) {
  return children
}