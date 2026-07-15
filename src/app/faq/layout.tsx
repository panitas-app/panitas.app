import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/faq"].title,
  description: PAGE_META["/faq"].description,
  openGraph: { title: PAGE_META["/faq"].title, description: PAGE_META["/faq"].description },
  twitter: { title: PAGE_META["/faq"].title, description: PAGE_META["/faq"].description },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
