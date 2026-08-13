import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { ProductDetail } from "@/components/dashboard/product-detail"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  return (
    <div className="p-4 md:p-6">
      <ProductDetail productId={id} />
    </div>
  )
}
