import { getCurrentStore } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { getEffectiveRate } from "@/lib/bcv"
import { hasModule } from "@/lib/plans"
import { prisma } from "@/lib/prisma"
import { DashboardTienda } from "@/components/dashboard/dashboard-tienda"
import { DashboardAgenda } from "@/components/dashboard/dashboard-agenda"
import { DashboardNegocio } from "@/components/dashboard/dashboard-negocio"
import { DashboardEmpresa } from "@/components/dashboard/dashboard-empresa"
export default async function DashboardPage() {
  const current = await getCurrentStore()
  if (!current) redirect("/onboarding")

  const planType = current.store.planType || current.store.plan
  const rate = await getEffectiveRate()

  const modules = {
    hasSales: hasModule(planType, "orders") || hasModule(planType, "products"),
    hasAppointments: hasModule(planType, "appointments"),
    hasCrm: hasModule(planType, "crm"),
    hasReports: hasModule(planType, "reports"),
  }

  const storeId = current.store.id
  const negocioId = current.store.negocioId
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  async function getSalesData() {
    if (!modules.hasSales) return null
    const orders = await prisma.order.findMany({ where: { storeId } })
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
    const todayOrders = orders.filter((o) => o.createdAt >= today)
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0)
    const weekOrders = orders.filter((o) => o.createdAt >= weekStart)
    const productCount = await prisma.product.count({ where: { storeId } })
    return { orders, totalRevenue, todayOrders, weekOrders, productCount, totalOrders: orders.length, todayRevenue: todayOrders.reduce((s, o) => s + o.total, 0), weekRevenue: weekOrders.reduce((s, o) => s + o.total, 0) }
  }

  async function getAppointmentData() {
    if (!modules.hasAppointments || !negocioId) return null
    const appointments = await prisma.appointment.findMany({ where: { negocioId } })
    const todayApps = appointments.filter((a) => {
      const d = new Date(a.date); return d.toDateString() === today.toDateString()
    })
    const serviceCount = await prisma.service.count({ where: { negocioId, isActive: true } })
    return { appointments, todayApps, pending: appointments.filter((a) => a.status === "pending").length, confirmed: appointments.filter((a) => a.status === "confirmed").length, completed: appointments.filter((a) => a.status === "completed").length, cancelled: appointments.filter((a) => a.status === "cancelled").length, serviceCount }
  }

  async function getCrmData() {
    if (!modules.hasCrm) return null
    const totalCustomers = await prisma.customer.count({ where: { storeId } })
    const customersWithOrders = await prisma.customer.count({ where: { storeId, totalOrders: { gt: 0 } } })
    const followUps = await prisma.customerFollowUp.count({ where: { storeId, status: "pending" } })
    return { totalCustomers, customersWithOrders, followUps }
  }

  async function getVisitorData() {
    const t = new Date(); t.setHours(0, 0, 0, 0)
    const ws = new Date(t); ws.setDate(ws.getDate() - ws.getDay())
    const ms = new Date(t.getFullYear(), t.getMonth(), 1)
    const lms = new Date(t.getFullYear(), t.getMonth() - 1, 1)

    const [tv, wv, mv, lmv, sources] = await Promise.all([
      prisma.storeVisit.findUnique({ where: { storeId_date: { storeId, date: t } } }),
      prisma.storeVisit.aggregate({ where: { storeId, date: { gte: ws } }, _sum: { count: true } }),
      prisma.storeVisit.aggregate({ where: { storeId, date: { gte: ms } }, _sum: { count: true } }),
      prisma.storeVisit.aggregate({ where: { storeId, date: { gte: lms, lt: ms } }, _sum: { count: true } }),
      prisma.trafficSource.findMany({
        where: { storeId, date: { gte: ms } },
        select: { source: true, count: true },
      }),
    ])

    const m = mv._sum.count || 0
    const lm = lmv._sum.count || 0
    const trend: "up" | "down" = m >= lm ? "up" : "down"
    const pct = lm > 0 ? Math.round(((m - lm) / lm) * 100) : 0

    const sourceMap: Record<string, number> = {}
    for (const s of sources) {
      sourceMap[s.source] = (sourceMap[s.source] || 0) + s.count
    }
    const totalSource = Object.values(sourceMap).reduce((a, b) => a + b, 0) || 1
    const trafficSources = Object.entries(sourceMap).map(([key, val]) => ({
      id: key,
      label: key === "direct" ? "Directo" : key === "social" ? "Redes Sociales" : key === "search" ? "Buscadores" : key === "whatsapp" ? "WhatsApp" : key === "email" ? "Email / CRM" : key,
      percentage: Math.round((val / totalSource) * 100),
    }))

    return { today: tv?.count || 0, week: wv._sum.count || 0, month: m, trend, trendPct: Math.abs(pct), sources: trafficSources }
  }

  async function getCategoryStats() {
    if (!modules.hasSales) return null
    const cats = await prisma.category.findMany({
      where: { storeId },
      include: { products: { include: { orderItems: true } } },
    })
    return cats.map((c) => ({ name: c.name, count: c.products.length, sales: c.products.reduce((s, p) => s + p.orderItems.length, 0) }))
  }

  async function getEmployeeCount() {
    if (planType !== "negocio" && planType !== "empresa") return 0
    return prisma.employee.count({ where: { storeId } })
  }

  async function getNewCustomers() {
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return prisma.customer.count({ where: { storeId, createdAt: { gte: t } } })
  }

  async function getPendingCommissions() {
    if (planType !== "empresa" && planType !== "empresarial") return 0
    return prisma.sellerCommission.count({ where: { status: "pending", order: { storeId } } })
  }

  async function getRecentActivity() {
    const activity: { id: string; type: string; desc: string; time: string; sortKey: number; status?: string }[] = []
    const recentOrders = await prisma.order.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 5 })
    for (const o of recentOrders) {
      activity.push({ id: `o-${o.id}`, type: "sale", desc: `Nuevo pedido #${o.orderNumber} — $${o.total.toFixed(2)}`, time: formatTimeAgo(o.createdAt), sortKey: o.createdAt.getTime(), status: o.status })
    }
    if (negocioId) {
      const recentApps = await prisma.appointment.findMany({ where: { negocioId }, orderBy: { createdAt: "desc" }, take: 5 })
      for (const a of recentApps) {
        activity.push({ id: `a-${a.id}`, type: a.status === "cancelled" ? "cancel" : "appointment", desc: `${a.status === "cancelled" ? "Cancelación:" : "Nueva reserva:"} ${a.customerName} — ${a.serviceId ? "Servicio" : "Cita"}`, time: formatTimeAgo(a.createdAt), sortKey: a.createdAt.getTime(), status: a.status })
      }
      const recentCusts = await prisma.customer.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 3 })
      for (const c of recentCusts) {
        activity.push({ id: `c-${c.id}`, type: "client", desc: `Nuevo cliente: ${c.name}`, time: formatTimeAgo(c.createdAt), sortKey: c.createdAt.getTime() })
      }
    }
    activity.sort((a, b) => b.sortKey - a.sortKey)
    return activity.slice(0, 10).map(({ sortKey, ...rest }) => rest)
  }

  function formatTimeAgo(date: Date) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Ahora"
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    return `hace ${days}d`
  }

  async function getServiceStats() {
    if (!modules.hasAppointments || !negocioId) return null
    const svcs = await prisma.service.findMany({
      where: { negocioId, isActive: true },
      include: { _count: { select: { appointments: true } } },
    })
    return svcs.map((s) => ({ name: s.name, count: s._count.appointments, sales: s._count.appointments }))
  }

  const [salesData, appointmentData, crmData, visitorData, categoryStats, serviceStats, employeeCount, newCustomers, recentActivity, pendingCommissions] = await Promise.all([
    getSalesData(),
    getAppointmentData(),
    getCrmData(),
    getVisitorData(),
    getCategoryStats(),
    getServiceStats(),
    getEmployeeCount(),
    getNewCustomers(),
    getRecentActivity(),
    getPendingCommissions(),
  ])

  const orders = salesData?.orders || []
  const cp = { store: current.store, rate, planType, visitorData }

  if (planType === "agenda") {
    return <DashboardAgenda {...cp} data={appointmentData!} orders={orders} serviceStats={serviceStats || []} />
  }
  if (planType === "negocio") {
    return <DashboardNegocio {...cp} sales={salesData!} appointments={appointmentData!} orders={orders} categoryStats={categoryStats || []} serviceStats={serviceStats || []} employeeCount={employeeCount} newCustomers={newCustomers} recentActivity={recentActivity} />
  }
  if (planType === "empresa" || planType === "empresarial") {
    return <DashboardEmpresa {...cp} sales={salesData!} appointments={appointmentData!} crm={crmData!} orders={orders} categoryStats={categoryStats || []} serviceStats={serviceStats || []} pendingCommissions={pendingCommissions} />
  }
  return <DashboardTienda {...cp} data={salesData!} orders={orders} categoryStats={categoryStats || []} />
}
