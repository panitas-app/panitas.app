"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { EmptyState } from "@/components/ui/empty-state"
import { LoadingState } from "@/components/ui/loading-state"
import { Pagination } from "@/components/ui/pagination"
import {
  Boxes,
  PackageOpen,
  PackageX,
  Store,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MessageCircleQuestion,
} from "lucide-react"
import { DeleteProductButton } from "@/components/dashboard/products-table"

type SortKey = "name" | "price" | "stock"

type Product = {
  id: string
  name: string
  price: number
  costPrice: number | null
  stock: number | null
  sku: string | null
  barcode: string | null
  images: string
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string } | null
}

type ProductMetrics = {
  total: number
  lowStock: number
  outOfStock: number
  inventoryValue: number
}

function money(n: number): string {
  return "$" + n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function firstImage(images: string): string | null {
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed[0] ?? null : null
  } catch {
    return null
  }
}

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClass: string
  value: string
  label: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 py-4">
        <Icon className={`size-5 ${iconClass}`} />
        <span className="text-2xl font-black text-accent">{value}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      </CardContent>
    </Card>
  )
}

function SortableHead({
  col,
  label,
  align,
  sort,
  order,
  onToggle,
}: {
  col: SortKey
  label: string
  align?: "right"
  sort: SortKey
  order: string
  onToggle: (col: SortKey) => void
}) {
  const active = sort === col
  const ariaSort = active ? (order === "asc" ? "ascending" : "descending") : "none"
  return (
    <TableHead aria-sort={ariaSort} className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
      >
        {label}
        {active
          ? (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
          : <ArrowUpDown className="size-3 opacity-40" />}
      </button>
    </TableHead>
  )
}

export function ProductsList({
  categories,
  canImport,
}: {
  categories: { id: string; name: string }[]
  canImport: boolean
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [metrics, setMetrics] = useState<ProductMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState<SortKey>("name")
  const [order, setOrder] = useState("asc")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const debouncedSearch = useDebounce(search, 300)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, order, page: String(page) })
      if (debouncedSearch) params.set("q", debouncedSearch)
      if (category) params.set("category", category)
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const json = await res.json()
        setProducts(json.data || [])
        setTotal(json.total || 0)
        setTotalPages(json.totalPages || 0)
        if (json.metrics) setMetrics(json.metrics)
      }
    } catch (e) { console.error("[unhandled error]", e) } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, sort, order, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const toggleSort = (col: SortKey) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc")
    else { setSort(col); setOrder("asc") }
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona productos, precios y stock de tu negocio.
          </p>
        </div>
        <div className="flex gap-2">
          {canImport && (
            <Link href="/dashboard/products/import">
              <Button variant="outline">Importar Excel</Button>
            </Link>
          )}
          <Link href="/dashboard/products/new">
            <Button>Nuevo Producto</Button>
          </Link>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Boxes} iconClass="text-primary" value={String(metrics.total)} label="Total" />
          <StatCard icon={PackageOpen} iconClass="text-warning" value={String(metrics.lowStock)} label="Stock bajo (≤5)" />
          <StatCard icon={PackageX} iconClass="text-destructive" value={String(metrics.outOfStock)} label="Agotados" />
          <StatCard icon={Store} iconClass="text-info" value={money(metrics.inventoryValue)} label="Valor inventario" />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Buscar por nombre, SKU o código de barras..."
          />
        </div>
        <select
          aria-label="Filtrar por categoría"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="h-10 w-full sm:w-auto rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Cargando productos..." />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={search || category ? "Sin resultados" : "No hay productos aún"}
              description={
                search || category
                  ? "Prueba con otra búsqueda o cambia el filtro de categoría."
                  : "Los productos aparecerán aquí cuando los crees desde el POS o el formulario."
              }
              action={
                !search && !category ? (
                  <Link href="/dashboard/products/new">
                    <Button>Crear primer producto</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagen</TableHead>
                    <SortableHead col="name" label="Nombre" sort={sort} order={order} onToggle={toggleSort} />
                    <SortableHead col="price" label="Precio" align="right" sort={sort} order={order} onToggle={toggleSort} />
                    <SortableHead col="stock" label="Stock" align="right" sort={sort} order={order} onToggle={toggleSort} />
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const img = firstImage(p.images)
                    return (
                      <TableRow key={p.id}>
                        <TableCell data-label="Imagen">
                          {img ? (
                            <img src={img} alt={p.name} className="size-10 rounded-md object-cover" />
                          ) : (
                            <div className="size-10 rounded-md bg-muted" />
                          )}
                        </TableCell>
                        <TableCell data-label="Nombre">
                          <Link href={`/dashboard/products/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                            {p.name}
                          </Link>
                          {p.sku && <span className="block text-[10px] text-muted-foreground">SKU: {p.sku}</span>}
                        </TableCell>
                        <TableCell data-label="Precio" className="text-right">
                          <span className="tabular-nums">{money(p.price)}</span>
                        </TableCell>
                        <TableCell data-label="Stock" className="text-right">
                          {p.stock !== null && p.stock <= 0 ? (
                            <span className="text-destructive font-semibold">Agotado</span>
                          ) : p.stock !== null && p.stock <= 5 ? (
                            <span className="text-warning font-semibold">{p.stock}</span>
                          ) : (
                            <span className="tabular-nums">{p.stock?.toString() ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell data-label="Categoría">
                          <span className="text-xs text-muted-foreground">{p.category?.name ?? "Sin categoría"}</span>
                        </TableCell>
                        <TableCell data-label="Estado">
                          <Badge variant={p.isActive ? "default" : "secondary"}>
                            {p.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell data-label="Acción" className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/products/${p.id}`}>
                              <Button variant="ghost" size="xs">
                                <Eye className="size-3.5" /> Ver
                              </Button>
                            </Link>
                            <DeleteProductButton productId={p.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="border-t border-border px-2">
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link
          href={`/dashboard/assistant?q=${encodeURIComponent("¿Qué productos necesitan atención por stock?")}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <MessageCircleQuestion className="size-4 text-primary" />
          Preguntar a Panitas
        </Link>
      </div>
    </div>
  )
}
