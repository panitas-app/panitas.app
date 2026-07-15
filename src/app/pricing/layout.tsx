import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/pricing"].title,
  description: PAGE_META["/pricing"].description,
  openGraph: { title: PAGE_META["/pricing"].title, description: PAGE_META["/pricing"].description },
  twitter: { title: PAGE_META["/pricing"].title, description: PAGE_META["/pricing"].description },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
