import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search } from "lucide-react"
import { DeleteProductButton } from "@/components/dashboard/products-table"
import { PaginationLinks } from "@/components/ui/pagination-links"

const PER_PAGE = 20

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}) {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const searchParamsResolved = await searchParams
  const { q, category } = searchParamsResolved
  const page = Math.max(1, parseInt(searchParamsResolved.page || "1"))

  const where: any = { storeId: current.store.id }
  if (q) where.name = { contains: q, mode: "insensitive" }
  if (category) where.categoryId = category

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  const categories = await prisma.category.findMany({
    where: { storeId: current.store.id },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Productos</h1>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="size-4" />
            Nuevo Producto
          </Button>
        </Link>
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
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
        <CardContent className="p-0">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagen</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {products.map((product) => {
                    const productImages: string[] = (() => {
                      try { return JSON.parse(product.images) } catch { return [] }
                    })()
                    return (
                    <TableRow key={product.id}>
                    <TableCell>
                      {productImages[0] ? (
                        <img
                          src={productImages[0]}
                          alt={product.name}
                          className="size-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {product.stock !== null && product.stock <= 0 ? (
                        <span className="text-destructive font-semibold">Agotado</span>
                      ) : product.stock !== null && product.stock <= 5 ? (
                        <span className="text-amber-600 font-semibold">{product.stock}</span>
                      ) : (
                        product.stock?.toString() || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Button variant="ghost" size="xs">
                            Editar
                          </Button>
                        </Link>
                        <DeleteProductButton productId={product.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
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
