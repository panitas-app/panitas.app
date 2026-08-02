import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Package,
  PackagePlus,
  Plus,
  Share2,
  ShoppingCart,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { MetricCard } from "@/components/dashboard/metric-card"
import { AskPanitas } from "@/components/dashboard/ask-panitas"

export interface ControlCenterProps {
  storeName: string
  slug: string
  userName?: string | null
  rate: number | null
  todayRevenue: number
  productsSold: number
  newCustomers: number
  lowStockCount: number
  pendingOrders: number
  productCount: number
  todayOrders: number
  hasSales: boolean
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ControlCenter({
  storeName,
  slug,
  userName,
  rate,
  todayRevenue,
  productsSold,
  newCustomers,
  lowStockCount,
  pendingOrders,
  productCount,
  todayOrders,
  hasSales,
}: ControlCenterProps) {
  const dateLabel = new Date().toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const alerts: { icon: React.ComponentType<{ className?: string }>; tone: string; text: string }[] = []
  if (lowStockCount > 0) {
    alerts.push({
      icon: AlertTriangle,
      tone: "text-brand",
      text: `${lowStockCount} producto${lowStockCount === 1 ? "" : "s"} con stock bajo. Revisa tu inventario.`,
    })
  }
  if (pendingOrders > 0) {
    alerts.push({
      icon: ShoppingCart,
      tone: "text-rose-500",
      text: `${pendingOrders} pedido${pendingOrders === 1 ? "" : "s"} pendiente${pendingOrders === 1 ? "" : "s"} por atender.`,
    })
  }
  if (alerts.length === 0) {
    alerts.push({
      icon: CheckCircle2,
      tone: "text-emerald-500",
      text: "Todo en orden. ¡Sigue así!",
    })
  }

  const recommended = (() => {
    if (productCount === 0 && hasSales) {
      return {
        title: "Registra tu primer producto",
        description: "Sube tu inventario para empezar a vender en tu tienda en línea.",
        href: "/dashboard/products/new",
        icon: PackagePlus,
      }
    }
    if (lowStockCount > 0) {
      return {
        title: "Revisa tu inventario bajo",
        description: "Algunos productos están cerca de agotarse. Repón stock a tiempo.",
        href: "/dashboard/products",
        icon: Package,
      }
    }
    if (todayOrders === 0) {
      return {
        title: "Comparte tu tienda",
        description: "Empieza a recibir pedidos compartiendo tu tienda con tus clientes.",
        href: `/${slug}`,
        icon: Share2,
      }
    }
    return {
      title: "Explora tu analítica",
      description: "Descubre de dónde vienen tus ventas y cómo está creciendo tu negocio.",
      href: "/dashboard/analytics",
      icon: DollarSign,
    }
  })()

  const RecommendedIcon = recommended.icon

  const quickActions = [
    ...(hasSales ? [{ href: "/dashboard/pos", label: "Nueva venta", icon: Plus }] : []),
    { href: "/dashboard/products/new", label: "Agregar producto", icon: PackagePlus },
    { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
    { href: `/${slug}`, label: "Ver tienda", icon: Share2 },
  ]

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {dateLabel}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            ¡Hola, {userName?.trim() || storeName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Este es el resumen de <span className="font-semibold text-foreground">{storeName}</span> hoy.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Ventas hoy"
          value={
            <span className="flex items-baseline gap-1.5">
              ${formatMoney(todayRevenue)}
              {rate != null && rate > 0 && (
                <span className="font-body text-xs font-semibold text-muted-foreground">
                  Bs. {formatMoney(todayRevenue * rate)}
                </span>
              )}
            </span>
          }
          sub={`${todayOrders} pedido${todayOrders === 1 ? "" : "s"} hoy`}
          icon={<DollarSign className="size-4" />}
          accent="primary"
        />
        <MetricCard
          label="Productos vendidos"
          value={productsSold}
          sub="unidades vendidas hoy"
          icon={<Package className="size-4" />}
          accent="brand"
        />
        <MetricCard
          label="Clientes nuevos"
          value={newCustomers}
          sub="clientes que se registraron hoy"
          icon={<Users className="size-4" />}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <AskPanitas />

          <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Alertas
              </h2>
              <Link
                href="/dashboard/analytics"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Ver más <ArrowRight className="size-3" />
              </Link>
            </div>
            <ul className="space-y-2.5">
              {alerts.slice(0, 3).map((a, i) => {
                const Icon = a.icon
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", a.tone)} />
                    <span className="text-sm text-muted-foreground">{a.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="w-full text-xs font-bold uppercase tracking-wider text-muted-foreground sm:w-auto">
              Accesos rápidos
            </p>
            {quickActions.map((qa) => {
              const Icon = qa.icon
              return (
                <Link
                  key={qa.href}
                  href={qa.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <Icon className="size-3.5" />
                  {qa.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-brand/10 blur-2xl" />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand">
              Acción recomendada
            </p>
            <h3 className="mt-2 flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <RecommendedIcon className="size-4.5 text-brand" />
              {recommended.title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {recommended.description}
            </p>
          </div>
          <Link
            href={recommended.href}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir ahora <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
