import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSellerFromCookies } from "@/lib/seller-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, DollarSign, Receipt } from "lucide-react"
import { PurchaseOrderDownload } from "@/components/seller/purchase-order"

export default async function SellerDashboardPage() {
  const session = await getSellerFromCookies()
  if (!session) redirect("/seller/login")

  const seller = await prisma.seller.findUnique({
    where: { id: session.sellerId },
    select: { id: true, name: true },
  })
  if (!seller) redirect("/seller/login")

  const [orders, commissions] = await Promise.all([
    prisma.order.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, total: true, createdAt: true, customerName: true },
    }),
    prisma.sellerCommission.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, amount: true, status: true, orderId: true, createdAt: true },
    }),
  ])

  const totalVentas = await prisma.order.count({ where: { sellerId: seller.id } })
  const totalComisiones = await prisma.sellerCommission.aggregate({
    where: { sellerId: seller.id, status: "paid" },
    _sum: { amount: true },
  })
  const comisionesPendientes = await prisma.sellerCommission.aggregate({
    where: { sellerId: seller.id, status: "pending" },
    _sum: { amount: true },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Ventas</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <ShoppingCart className="size-5 text-primary" />
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalVentas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <DollarSign className="size-5 text-green-500" />
            <CardTitle className="text-sm font-medium">Comisiones Cobradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">
              ${Number(totalComisiones._sum.amount || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Receipt className="size-5 text-yellow-500" />
            <CardTitle className="text-sm font-medium">Comisiones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">
              ${Number(comisionesPendientes._sum.amount || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Últimas Ventas</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No has realizado ventas aún</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">#{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{o.customerName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">${Number(o.total).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <PurchaseOrderDownload orderId={o.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
