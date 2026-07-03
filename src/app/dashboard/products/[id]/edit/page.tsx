import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { ProductForm } from "@/components/dashboard/product-form"
import { ProductStockHistory } from "@/components/dashboard/product-stock-history"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const current = await getCurrentStore()
  if (!current) redirect("/onboarding")

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product || product.storeId !== current.store.id) notFound()

  const categories = await prisma.category.findMany({
    where: { storeId: current.store.id },
    orderBy: { name: "asc" },
  })

  return (
    <div className="w-full flex flex-col items-center p-4 md:p-8 bg-slate-50/50">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">Editar Producto</h1>
          <p className="text-sm text-slate-500">Actualiza los detalles y la configuración de tu producto</p>
        </div>
        <div className="text-left">
          <ProductForm product={product} categories={categories} />
        </div>
        <div data-tour="stock-history" className="text-left">
          <ProductStockHistory productId={id} />
        </div>
      </div>
    </div>
  )
}
