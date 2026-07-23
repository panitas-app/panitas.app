"use client"

import { useState, useEffect } from "react"
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
import { LogOut, User, Share2, QrCode, Sparkles, Zap, Clock, CheckCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Store, User as UserType } from "@prisma/client"
import { QRModal } from "@/components/dashboard/qr-modal"
import type { Role } from "@/lib/roles"
import { roleLabels, roleColors } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { useBcvRate } from "@/lib/bcv-context"

interface PlanStatusButton {
  label: string
  href: string
  className: string
  icon: React.ReactNode
}

function computePlanStatus(
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

  // 1. Plan activo — check if renewal is needed (within 5 days for monthly, 1 day for installment 2nd payment)
  if (planEstado === "activo") {
    if (planVencimiento) {
      const venc = new Date(planVencimiento)
      const now = new Date()
      const daysLeft = Math.ceil((venc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // For monthly single payment: renew when ≤5 days left
      if (latestSubscription?.period === "monthly" && latestSubscription.paymentMode === "single" && daysLeft <= 5 && daysLeft >= 0) {
        return {
          label: "Renueva tu suscripción",
          href: subscribeHref,
          className: "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-300 shadow-lg shadow-yellow-400/30 animate-pulse font-extrabold",
          icon: <RefreshCw className="size-3.5" />,
        }
      }

      // For installment: renew when ≤1 day left for 2nd payment
      if (latestSubscription?.paymentMode === "installment" && !latestSubscription.secondPaymentPaid && latestSubscription.secondPaymentDue) {
        const secondDue = new Date(latestSubscription.secondPaymentDue)
        const daysLeftSecond = Math.ceil((secondDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeftSecond <= 1 && daysLeftSecond >= 0) {
          return {
            label: "Renueva tu suscripción",
            href: subscribeHref,
            className: "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-300 shadow-lg shadow-yellow-400/30 animate-pulse font-extrabold",
            icon: <RefreshCw className="size-3.5" />,
          }
        }
      }
    }

    // Plan active, no renewal needed
    return {
      label: "Plan activo",
      href: "/dashboard/settings?tab=subscription",
      className: "border-green-400/20 bg-green-500/5 text-green-300 hover:bg-green-500/10",
      icon: <CheckCircle className="size-3.5" />,
    }
  }

  // 2. Payment pending verification (most recent subscription status is "pending")
  if (latestSubscription?.status === "pending" || latestSubscription?.status === "verified") {
    return {
      label: "Pago en verificación",
      href: "/dashboard/settings?tab=subscription",
      className: "border-yellow-400/20 bg-yellow-500/5 text-yellow-300 hover:bg-yellow-500/10",
      icon: <Clock className="size-3.5" />,
    }
  }

  // 3. Default: activate plan (pendiente — no payment submitted yet)
  return {
    label: "Activa tu plan",
    href: subscribeHref,
    className: "border-yellow-400 bg-yellow-400 text-black hover:bg-yellow-300 hover:border-yellow-300 shadow-lg shadow-yellow-400/30 animate-pulse font-extrabold",
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
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const { rate: bcvRate } = useBcvRate()
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U"

  const [storeUrl, setStoreUrl] = useState("")
  useEffect(() => { setStoreUrl(`${window.location.origin}/store/${store.slug}`) }, [store.slug])
  const storeUrlQr = storeUrl ? `${storeUrl}?ref=qr` : ""

  const planButton = computePlanStatus(store, planEstado, planId, planVencimiento, latestSubscription)

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
      <header data-tour="topbar" className="sticky top-0 z-20 flex h-16 items-center justify-between glass-dark px-6">
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-500/5 px-3.5 py-1 text-xs font-bold text-emerald-300 sm:flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            $ 1 = Bs. {bcvRate > 0 ? bcvRate.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Plan status button */}
          <Link
            href={planButton.href}
            className={cn(
              "hidden items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all md:flex",
              planButton.className,
            )}
          >
            {planButton.icon}
            {planButton.label}
          </Link>

          {/* Share button */}
          <button
            onClick={handleCopyLink}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted sm:flex"
          >
            <Share2 className="size-3.5" />
            Compartir
          </button>

          {/* QR button */}
          <button
            onClick={() => setQrOpen(true)}
            className="hidden items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted sm:flex"
          >
            <QrCode className="size-3.5" />
            QR
          </button>

          <Link href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer" className="group hidden items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground/70 transition-all hover:bg-muted md:flex">
            Ver tienda
          </Link>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-2.5 rounded-full outline-none hover:opacity-85 transition-opacity cursor-pointer">
                  <Avatar size="sm" className="ring-2 ring-white/10">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="bg-muted text-foreground/70 font-extrabold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden flex-col items-start text-left sm:flex">
                    <span className="text-xs font-black text-accent max-w-[120px] truncate leading-tight">
                      {user?.name || user?.email}
                    </span>
                    <span className={cn("text-[9px] font-semibold", roleColors[role].split(" ")[0])}>{roleLabels[role]}</span>
                  </div>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-52 rounded-2xl border border-border/10 bg-white/98 backdrop-blur-2xl p-2.5 shadow-2xl">
              <DropdownMenuLabel className="px-3.5 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-accent truncate">{user?.name}</span>
                  <span className="text-xs text-muted-foreground dark:text-slate-500 truncate mt-0.5">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-background my-1.5" />
              
              <Link href="/pricing">
                <DropdownMenuItem className="rounded-xl px-3.5 py-3 text-xs font-bold text-foreground/70 hover:bg-muted hover:text-foreground cursor-pointer flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Ver Planes
                </DropdownMenuItem>
              </Link>

              <DropdownMenuSeparator className="bg-background my-1.5" />

              <DropdownMenuItem
                onClick={() => signOut()}
                className="rounded-xl px-3.5 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer flex items-center gap-2"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <QRModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        storeUrl={storeUrlQr}
        storeName={store.name}
      />
    </>
  )
}
