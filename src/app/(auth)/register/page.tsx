import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import RegisterContent from "@/components/auth/register-content"

export const metadata: Metadata = {
  title: PAGE_META["/register"].title,
  description: PAGE_META["/register"].description,
  openGraph: { title: PAGE_META["/register"].title, description: PAGE_META["/register"].description },
  twitter: { title: PAGE_META["/register"].title, description: PAGE_META["/register"].description },
}

export default async function RegisterPage(props: { searchParams: Promise<{ plan?: string }> }) {
  const searchParams = await props.searchParams
  const session = await auth()
  return <RegisterContent session={session} plan={searchParams.plan} />
}
