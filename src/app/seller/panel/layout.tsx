import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSellerFromCookies } from "@/lib/seller-auth"
import { SellerSidebar } from "./seller-sidebar"

export default async function SellerPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSellerFromCookies()
  if (!session) redirect("/seller/login")

  const seller = await prisma.seller.findUnique({
    where: { id: session.sellerId },
    select: { id: true, name: true, store: { select: { name: true } } },
  })

  if (!seller) redirect("/seller/login")

  return (
    <div className="flex h-screen bg-[#0A1628]">
      <SellerSidebar seller={{ name: seller.name, storeName: seller.store.name }} />
      <main className="flex-1 overflow-y-auto bg-background rounded-l-2xl p-6">
        {children}
      </main>
    </div>
  )
}
