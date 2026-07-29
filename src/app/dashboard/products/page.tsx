import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Plus, Search, Upload } from "lucide-react"
import { ProductsAccordion } from "@/components/dashboard/products-accordion"
import { PaginationLinks } from "@/components/ui/pagination-links"
import { resolvePlanType } from "@/lib/plans"

const PER_PAGE = 20

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}) {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const resolvedPlan = resolvePlanType(current.store.planType)
  const canImport = resolvedPlan === "comercio" || resolvedPlan === "mayorista"

  const searchParamsResolved = await searchParams
  const { q, category } = searchParamsResolved
  const page = Math.max(1, parseInt(searchParamsResolved.page || "1"))

  const where: any = { storeId: current.store.id }
  if (q) where.name = { contains: q, mode: "insensitive" }
  if (category) where.categoryId = category

  let products: any[] = []
  let total = 0
  let categories: any[] = []
  try {
    const result = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      prisma.product.count({ where }),
    ])
    products = result[0]
    total = result[1]
    categories = await prisma.category.findMany({
      where: { storeId: current.store.id },
      orderBy: { name: "asc" },
    })
  } catch (e) {
    console.error("[products page]", e)
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          {canImport && (
            <Link href="/dashboard/products/import">
              <Button variant="outline">
                <Upload className="size-4" />
                Importar Excel
              </Button>
            </Link>
          )}
          <Link href="/dashboard/products/new">
            <Button>
              <Plus className="size-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <form>
            <Input
              name="q"
              placeholder="Buscar productos..."
              defaultValue={q}
              className="pl-8"
            />
          </form>
        </div>
        <form>
          <select
            name="category"
            className="h-10 w-full sm:w-auto rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue={category || ""}
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </form>
      </div>

      <Card>
        <CardContent className="p-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No hay productos aún</p>
              <Link href="/dashboard/products/new">
                <Button variant="outline" className="mt-4">
                  <Plus className="size-4" />
                  Crear primer producto
                </Button>
              </Link>
            </div>
          ) : (
            <ProductsAccordion products={products} categories={categories} />
          )}
          <PaginationLinks
            page={page}
            totalPages={totalPages}
            total={total}
            basePath="/dashboard/products"
            searchParams={searchParamsResolved}
          />
        </CardContent>
      </Card>
    </div>
  )
}
