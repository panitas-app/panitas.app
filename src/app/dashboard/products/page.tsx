import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProductsList } from "@/components/dashboard/products-list"

import { resolvePlanType } from "@/lib/plans"

export default async function ProductsPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const resolvedPlan = resolvePlanType(current.store.planType)
  const canImport = resolvedPlan === "comercio" || resolvedPlan === "mayorista"

  let categories: { id: string; name: string }[] = []
  try {
    categories = await prisma.category.findMany({
      where: { storeId: current.store.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  } catch (e) {
    console.error("[products page] categories", e)
  }

  return (
    <div className="p-4 md:p-6">
      <ProductsList categories={categories} canImport={canImport} />
    </div>
  )
}
