"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { DeleteProductButton } from "@/components/dashboard/products-table"

interface Product {
  id: string
  name: string
  price: number
  stock: number | null
  images: string
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string } | null
}

interface CategoryGroup {
  category: { id: string; name: string }
  products: Product[]
}

export function ProductsAccordion({
  products,
  categories,
}: {
  products: Product[]
  categories: { id: string; name: string }[]
}) {
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  function toggleCat(id: string) {
    setCollapsedCats((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const groupedProducts: CategoryGroup[] = useMemo(
    () =>
      categories
        .filter((c) => products.some((p) => p.categoryId === c.id))
        .map((c) => ({
          category: c,
          products: products.filter((p) => p.categoryId === c.id),
        })),
    [products, categories]
  )

  const uncategorized = useMemo(
    () => products.filter((p) => !p.categoryId),
    [products]
  )

  function renderProductRow(product: Product) {
    const productImages: string[] = (() => {
      try {
        return JSON.parse(product.images)
      } catch {
        return []
      }
    })()
    return (
      <TableRow key={product.id}>
        <TableCell data-label="Imagen">
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
        <TableCell className="font-medium" data-label="Nombre">
          {product.name}
        </TableCell>
        <TableCell data-label="Precio">
          ${product.price.toFixed(2)}
        </TableCell>
        <TableCell data-label="Stock">
          {product.stock !== null && product.stock <= 0 ? (
            <span className="text-destructive font-semibold">Agotado</span>
          ) : product.stock !== null && product.stock <= 5 ? (
            <span className="text-amber-600 font-semibold">
              {product.stock}
            </span>
          ) : (
            product.stock?.toString() || "—"
          )}
        </TableCell>
        <TableCell data-label="Estado">
          <Badge
            variant={product.isActive ? "default" : "secondary"}
          >
            {product.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </TableCell>
        <TableCell data-label="Acciones">
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
  }

  function renderCategorySection(
    label: string,
    items: Product[],
    catId: string
  ) {
    if (items.length === 0) return null
    return (
      <div key={catId} className="mb-4">
        <button
          onClick={() => toggleCat(catId)}
          className="flex items-center gap-2 w-full text-left text-sm font-bold mb-2 hover:text-primary transition-colors"
        >
          {collapsedCats.has(catId) ? (
            <ChevronRight className="size-4 shrink-0" />
          ) : (
            <ChevronDown className="size-4 shrink-0" />
          )}
          {label}
          <span className="text-muted-foreground font-normal text-xs">
            ({items.length})
          </span>
        </button>
        {!collapsedCats.has(catId) && (
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
            <TableBody>{items.map(renderProductRow)}</TableBody>
          </Table>
        )}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No hay productos aún</p>
      </div>
    )
  }

  return (
    <div>
      {groupedProducts.map((g) =>
        renderCategorySection(g.category.name, g.products, g.category.id)
      )}
      {renderCategorySection("Sin categoría", uncategorized, "__uncat")}
    </div>
  )
}
