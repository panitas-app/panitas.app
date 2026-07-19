import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductForm } from "@/components/dashboard/product-form"

export default async function NewProductPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  let categories: any[] = []
  try {
    categories = await prisma.category.findMany({
      where: { storeId: current.store.id },
      orderBy: { name: "asc" },
    })
  } catch (e) {
    console.error("[new product page] categories", e)
  }

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50/50">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">Crear Producto</h1>
          <p className="text-sm text-slate-500">Completa la información para agregar un nuevo producto a tu tienda</p>
        </div>
        <div className="text-left">
          <ProductForm categories={categories} />
        </div>
      </div>
    </div>
  )
}
