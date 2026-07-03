"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Search, Eye, Phone, Mail, ShoppingBag, DollarSign, Users } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Pagination } from "@/components/ui/pagination"

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  documentId: string | null
  totalSpent: number
  totalOrders: number
  lastPurchaseAt: string | null
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("name")
  const [order, setOrder] = useState("asc")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, order, page: String(page) })
      if (search) params.set("q", search)
      const res = await fetch(`/api/customers?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCustomers(json.data || [])
        setTotal(json.total || 0)
        setTotalPages(json.totalPages || 0)
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [search, sort, order, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Reset to page 1 when search/sort changes
  useEffect(() => { setPage(1) }, [search, sort, order])

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc")
    else { setSort(col); setOrder("asc") }
  }

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-[10px] text-slate-400">
      {sort === col ? (order === "asc" ? "▲" : "▼") : "▽"}
    </span>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-center font-heading text-xl font-semibold">Clientes</h1>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <Users className="size-5 text-primary" />
            <span className="text-2xl font-black text-accent">{total}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <ShoppingBag className="size-5 text-emerald-500" />
            <span className="text-2xl font-black text-accent">
              {customers.reduce((s, c) => s + c.totalOrders, 0)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Órdenes</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <DollarSign className="size-5 text-amber-500" />
            <span className="text-2xl font-black text-accent">
              ${customers.reduce((s, c) => s + c.totalSpent, 0).toFixed(0)}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gastado</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 py-4">
            <span className="text-2xl font-black text-accent">
              {customers.length > 0
                ? `$${(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length).toFixed(0)}`
                : "$0"}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promedio</span>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">Cargando...</div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="size-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No hay clientes registrados</p>
              <p className="text-xs text-slate-400 mt-1">Los clientes aparecerán automáticamente cuando reciban pedidos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    Nombre <SortIcon col="name" />
                  </TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("totalOrders")}>
                    Órdenes <SortIcon col="totalOrders" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("totalSpent")}>
                    Total gastado <SortIcon col="totalSpent" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("lastPurchaseAt")}>
                    Última compra <SortIcon col="lastPurchaseAt" />
                  </TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.documentId && (
                          <span className="text-[10px] text-slate-400">{c.documentId}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone className="size-3 text-slate-400" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 text-xs text-slate-600">
                            <Mail className="size-3 text-slate-400" /> {c.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{c.totalOrders}</TableCell>
                    <TableCell className="text-right font-bold">${c.totalSpent.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs text-slate-500">
                      {c.lastPurchaseAt ? formatDate(c.lastPurchaseAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/customers/${c.id}`}>
                        <Button variant="ghost" size="xs">
                          <Eye className="size-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
