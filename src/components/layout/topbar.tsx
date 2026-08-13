"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, CheckCircle, Clock, LogOut, Menu, QrCode, RefreshCw, Share2, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Store, User as UserType } from "@prisma/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/lib/auth-client"
import { QRModal } from "@/components/dashboard/qr-modal"
import type { Role } from "@/lib/roles"
import { roleColors, roleLabels } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { useBcvRate } from "@/lib/bcv-context"
import { useAssistant } from "@/components/assistant/assistant-provider"

interface PlanStatusButton {
  label: string
  href: string
  className: string
  icon: React.ReactNode
}

export function computePlanStatus(
  store: Store,
  planEstado: string,
  planId: string,
  planVencimiento: string | null,
  latestSubscription: {
    status: string
    endDate: string | null
    paymentMode: string
    secondPaymentDue: string | null
    secondPaymentPaid: boolean
    period: string
  } | null,
): PlanStatusButton {
  const subscribeHref = `/subscribe?plan=${encodeURIComponent(planId)}`

  if (planEstado === "activo") {
    if (planVencimiento) {
      const venc = new Date(planVencimiento)
      const now = new Date()
      const daysLeft = Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (latestSubscription?.period === "monthly" && latestSubscription.paymentMode === "single" && daysLeft <= 5 && daysLeft >= 0) {
        return {
          label: "Renueva tu suscripción",
          href: subscribeHref,
          className: "border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-extrabold",
          icon: <RefreshCw className="size-3.5" />,
        }
      }

      if (latestSubscription?.paymentMode === "installment" && !latestSubscription.secondPaymentPaid && latestSubscription.secondPaymentDue) {
        const secondDue = new Date(latestSubscription.secondPaymentDue)
        const daysLeftSecond = Math.ceil((secondDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeftSecond <= 1 && daysLeftSecond >= 0) {
          return {
            label: "Renueva tu suscripción",
            href: subscribeHref,
            className: "border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-extrabold",
            icon: <RefreshCw className="size-3.5" />,
          }
        }
      }
    }

    return {
      label: "Plan activo",
      href: "/dashboard/settings?tab=subscription",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15",
      icon: <CheckCircle className="size-3.5" />,
    }
  }

  if (latestSubscription?.status === "pending" || latestSubscription?.status === "verified") {
    return {
      label: "Pago en verificación",
      href: "/dashboard/settings?tab=subscription",
      className: "border-brand/30 bg-brand/10 text-amber-600 hover:bg-brand/15",
      icon: <Clock className="size-3.5" />,
    }
  }

  return {
    label: "Activa tu plan",
    href: subscribeHref,
    className: "border-brand-primary bg-brand-primary text-white shadow-lg shadow-brand-primary/30 font-extrabold",
    icon: <Zap className="size-3.5" />,
  }
}

export function DashboardTopbar({
  store,
  user,
  role,
  planEstado,
  planId,
  planVencimiento,
  latestSubscription,
  onOpenMenu,
}: {
  store: Store
  user: UserType | null
  role: Role
  planEstado: string
  planId: string
  planVencimiento: string | null
  latestSubscription: {
    status: string
    endDate: string | null
    paymentMode: string
    secondPaymentDue: string | null
    secondPaymentPaid: boolean
    period: string
  } | null
  onOpenMenu: () => void
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const { rate: bcvRate, showBolivares } = useBcvRate()
  const { openAssistant } = useAssistant()
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U"

  const [storeUrl, setStoreUrl] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setStoreUrl(`${window.location.origin}/${store.slug}`), 0)
    return () => clearTimeout(t)
  }, [store.slug])
  const storeUrlQr = storeUrl ? `${storeUrl}?ref=qr` : ""

  const planButton = useMemo(
    () => computePlanStatus(store, planEstado, planId, planVencimiento, latestSubscription),
    [store, planEstado, planId, planVencimiento, latestSubscription],
  )

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${storeUrl}?ref=whatsapp`)
      toast.success("Enlace copiado al portapapeles")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  return (
    <>
      <header
        data-tour="topbar"
        className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-3 backdrop-blur-xl safe-top sm:px-4 lg:h-16 lg:px-6"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <span className="truncate font-heading text-sm font-extrabold text-foreground sm:hidden">{store.name}</span>

          {showBolivares && (
            <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 sm:flex">
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              $ 1 = Bs. {bcvRate > 0 ? bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
          <button
            onClick={() => openAssistant()}
            className="hidden items-center gap-1.5 rounded-xl border border-brand-primary/25 bg-brand-soft px-3 py-2 text-xs font-bold text-brand-primary transition-all hover:bg-brand-primary/15 sm:flex"
          >
            <Bot className="size-3.5" />
            Panitas
          </button>

          <Link
            href={planButton.href}
            className={cn(
              "hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all md:flex",
              planButton.className,
            )}
          >
            {planButton.icon}
            {planButton.label}
          </Link>

          <button
            onClick={handleCopyLink}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted sm:flex"
          >
            <Share2 className="size-3.5" />
            Compartir
          </button>

          <button
            onClick={() => setQrOpen(true)}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted sm:flex"
          >
            <QrCode className="size-3.5" />
            QR
          </button>

          <Link
            href={`/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted md:flex"
          >
            {planId === "agenda" ? "Ver mi link" : "Ver tienda"}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex cursor-pointer items-center gap-2.5 rounded-full outline-none transition-opacity hover:opacity-85">
                  <Avatar size="sm" className="ring-2 ring-brand-primary/20">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="bg-brand-soft font-extrabold text-brand-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start text-left sm:flex">
                    <span className="max-w-[120px] truncate text-xs font-black text-foreground leading-tight">
                      {user?.name || user?.email}
                    </span>
                    <span className={cn("text-[9px] font-semibold", roleColors[role].split(" ")[0])}>{roleLabels[role]}</span>
                  </div>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-52 rounded-2xl border border-border bg-white p-2.5 shadow-2xl">
              <DropdownMenuLabel className="px-3.5 py-3">
                <div className="flex flex-col">
                  <span className="truncate text-sm font-extrabold text-foreground">{user?.name}</span>
                  <span className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-1.5" />

              <Link href="/pricing">
                <DropdownMenuItem className="flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-3 text-xs font-bold text-foreground/70 hover:bg-muted hover:text-foreground">
                  <Sparkles className="size-4 text-brand-primary" />
                  Ver Planes
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator className="bg-border my-1.5" />

              <DropdownMenuItem
                onClick={() => signOut()}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <QRModal open={qrOpen} onOpenChange={setQrOpen} storeUrl={storeUrlQr} storeName={store.name} />
    </>
  )
}
