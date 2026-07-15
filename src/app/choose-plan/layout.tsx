import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/choose-plan"].title,
  description: PAGE_META["/choose-plan"].description,
  openGraph: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
  twitter: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
}

export default function ChoosePlanLayout({ children }: { children: React.ReactNode }) {
  return children
}
