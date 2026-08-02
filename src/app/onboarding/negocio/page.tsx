import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const metadata = {
  title: "Configura tu negocio — Panitas Negocios",
}

export default async function OnboardingNegocioPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/register")

  const [ownedStore, member] = await Promise.all([
    prisma.store.findUnique({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
    prisma.storeMember.findFirst({ where: { userId: session.user.id }, select: { id: true } }).catch(() => null),
  ])

  if (ownedStore || member) redirect("/dashboard")

  return <OnboardingWizard />
}
