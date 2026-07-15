import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { JoinContent } from "./join-content"

export const metadata: Metadata = {
  title: PAGE_META["/join"].title,
  description: PAGE_META["/join"].description,
  openGraph: { title: PAGE_META["/join"].title, description: PAGE_META["/join"].description },
  twitter: { title: PAGE_META["/join"].title, description: PAGE_META["/join"].description },
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const session = await auth()
  const { token } = await searchParams

  return <JoinContent token={token || ""} isLoggedIn={!!session?.user?.id} />
}
