import { PAGE_META } from "@/lib/seo/constants"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: PAGE_META["/choose-plan"].title,
  description: PAGE_META["/choose-plan"].description,
  openGraph: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
  twitter: { title: PAGE_META["/choose-plan"].title, description: PAGE_META["/choose-plan"].description },
}

export default async function ChoosePlanLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (session?.user?.id) {
    const [storeMember, ownedStore] = await Promise.all([
      prisma.storeMember.findFirst({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
      prisma.store.findUnique({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
    ])
    if (storeMember || ownedStore) {
      redirect("/dashboard")
    }
  }
  return children
}