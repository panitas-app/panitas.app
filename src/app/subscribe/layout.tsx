import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/subscribe"].title,
  description: PAGE_META["/subscribe"].description,
  openGraph: { title: PAGE_META["/subscribe"].title, description: PAGE_META["/subscribe"].description },
  twitter: { title: PAGE_META["/subscribe"].title, description: PAGE_META["/subscribe"].description },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children
}
