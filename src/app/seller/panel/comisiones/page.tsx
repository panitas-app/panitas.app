import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSellerFromCookies } from "@/lib/seller-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function SellerComisionesPage() {
  const session = await getSellerFromCookies()
  if (!session) redirect("/seller/login")

  const commissions = await prisma.sellerCommission.findMany({
    where: { sellerId: session.sellerId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true, total: true } } },
  })

  const totalPagadas = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPendientes = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Comisiones</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-500">Cobradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">${totalPagadas.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-500">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-500">${totalPendientes.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Historial de Comisiones</CardTitle></CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin comisiones registradas</p>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">Orden #{c.order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Base: ${Number(c.order.total).toFixed(2)} &middot; {c.type === "percentage" ? `${c.value}%` : `$${c.value}`}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className="text-sm font-bold">${Number(c.amount).toFixed(2)}</p>
                    <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                      {c.status === "paid" ? "Pagada" : "Pendiente"}
                    </Badge>
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
