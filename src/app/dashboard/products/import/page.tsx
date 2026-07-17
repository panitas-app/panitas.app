import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ImportWizard } from "@/components/dashboard/import-wizard"
import { resolvePlanType } from "@/lib/plans"

export default async function ImportPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const member = await prisma.storeMember.findFirst({
    where: { userId: session.user.id },
    select: { store: { select: { id: true, planType: true } } },
  })
  const store = member?.store ?? await prisma.store.findUnique({
    where: { userId: session.user.id },
    select: { id: true, planType: true },
  })

  if (!store) redirect("/choose-plan")

  const resolvedPlan = resolvePlanType(store.planType)
  if (resolvedPlan !== "comercio" && resolvedPlan !== "mayorista") {
    redirect("/dashboard/products")
  }

  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6">
      <ImportWizard storeId={store.id} categories={categories} />
    </div>
  )
}
