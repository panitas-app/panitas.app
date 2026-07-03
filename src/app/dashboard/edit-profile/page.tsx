import { redirect } from "next/navigation"
import { getCurrentStore } from "@/lib/permissions"
import { EditProfileForm } from "@/components/dashboard/edit-profile-form"

export default async function EditProfilePage() {
  const current = await getCurrentStore()
  if (!current) redirect("/onboarding")

  const planType = current.store.planType || current.store.plan || "tienda"

  return (
    <div className="mx-auto max-w-6xl py-6 px-4">
      <EditProfileForm store={current.store} planType={planType} storeId={current.store.id} />
    </div>
  )
}
