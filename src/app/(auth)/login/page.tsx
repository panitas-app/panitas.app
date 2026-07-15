import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: PAGE_META["/login"].title,
  description: PAGE_META["/login"].description,
  openGraph: { title: PAGE_META["/login"].title, description: PAGE_META["/login"].description },
  twitter: { title: PAGE_META["/login"].title, description: PAGE_META["/login"].description },
}

export default function LoginPage() {
  redirect("/")
}
