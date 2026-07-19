import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ImportWizard } from "@/components/dashboard/import-wizard"
import { resolvePlanType } from "@/lib/plans"

export default async function ImportPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  let store: { id: string; planType: string } | null = null
  try {
    const member = await prisma.storeMember.findFirst({
      where: { userId: session.user.id },
      select: { store: { select: { id: true, planType: true } } },
    })
    store = member?.store ?? await prisma.store.findUnique({
      where: { userId: session.user.id },
      select: { id: true, planType: true },
    })
  } catch (e) {
    console.error("[import page] store lookup", e)
  }

  if (!store) redirect("/choose-plan")

  const resolvedPlan = resolvePlanType(store.planType)
  if (resolvedPlan !== "comercio" && resolvedPlan !== "mayorista") {
    redirect("/dashboard/products")
  }

  let categories: { id: string; name: string }[] = []
  try {
    categories = await prisma.category.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  } catch (e) {
    console.error("[import page] categories", e)
  }

  return (
    <div className="p-6">
      <ImportWizard storeId={store.id} categories={categories} />
    </div>
  )
}
