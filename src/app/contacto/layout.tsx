import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: PAGE_META["/contacto"].title,
  description: PAGE_META["/contacto"].description,
  openGraph: { title: PAGE_META["/contacto"].title, description: PAGE_META["/contacto"].description },
  twitter: { title: PAGE_META["/contacto"].title, description: PAGE_META["/contacto"].description },
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children
}
