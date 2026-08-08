import { redirect } from "next/navigation"
import { getCurrentStore } from "@/lib/permissions"
import { auth } from "@/lib/auth"
import { applyPlanSelection } from "@/lib/actions/plan-selection"
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat"

export default async function DashboardPage(props: { searchParams?: Promise<{ plan?: string }> }) {
  const searchParams = await props?.searchParams
  const planParam = searchParams?.plan

  // Handle plan selection via server action (runs once, then redirect)
  if (planParam) {
    await applyPlanSelection(planParam)
    redirect("/dashboard")
  }

  let current
  try {
    current = await getCurrentStore()
  } catch (e) {
    console.error("[dashboard page getCurrentStore error]", e)
    throw e
  }
  if (!current) redirect("/choose-plan")

  const session = await auth()

  return <AnimatedAIChat storeName={current.store.name} userName={session?.user?.name} />
}
