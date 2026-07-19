import { getCurrentStore } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
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
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { Eye, ShoppingCart, Plus } from "lucide-react"
import { PaginationLinks } from "@/components/ui/pagination-links"

const PER_PAGE = 20

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"> = {
  pending: "secondary",
  confirmed: "default",
  preparing: "outline",
  shipped: "ghost",
  delivered: "ghost",
  cancelled: "destructive",
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
}

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const current = await getCurrentStore()
  if (!current) redirect("/choose-plan")

  const params = await searchParams
  const { status } = params
  const page = Math.max(1, parseInt(params.page || "1"))

  const where: any = { storeId: current.store.id, creditTerm: null }
  if (status && status !== "all") where.status = status

  let orders: any[] = []
  let total = 0
  try {
    const result = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      prisma.order.count({ where }),
    ])
    orders = result[0]
    total = result[1]
  } catch (e) {
    console.error("[orders page]", e)
  }

  const totalPages = Math.ceil(total / PER_PAGE)

  const statuses = ["all", "pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-center font-heading text-xl font-semibold">Pedidos</h1>

      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <ShoppingCart className="size-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Vender en tienda</h2>
            <p className="text-xs text-muted-foreground max-w-md">
              Usa el POS para ventas presenciales, con envío, o a crédito
            </p>
          </div>
          <Link href="/dashboard/pos">
            <Button className="gap-2 mt-1">
              <Plus className="size-4" />
              Ir al POS
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-1">
        {statuses.map((s) => {
          const isActive = s === "all" ? !status : status === s
          return (
            <Link
              key={s}
              href={s === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full"
              >
                {s === "all" ? "Todos" : statusLabels[s]}
              </Button>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No hay pedidos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Pedido #</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Fecha</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Pago</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-center font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-center">{order.customerName}</TableCell>
                    <TableCell className="text-center">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-center">${order.total.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusColors[order.status] || "secondary"}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs">
                        {paymentStatusLabels[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/dashboard/orders/${order.id}`}>
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
          <PaginationLinks
            page={page}
            totalPages={totalPages}
            total={total}
            basePath="/dashboard/orders"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  )
}
