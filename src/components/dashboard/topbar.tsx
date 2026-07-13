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
import { LogOut, User, Share2, QrCode, Crown, Sparkles } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Store, User as UserType } from "@prisma/client"
import { QRModal } from "@/components/dashboard/qr-modal"
import type { Role } from "@/lib/roles"
import { roleLabels, roleColors } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { useBcvRate } from "@/lib/bcv-context"

const planLabels: Record<string, { label: string; color: string }> = {
  tienda: { label: "Tienda", color: "text-muted-foreground" },
  agenda: { label: "Agenda", color: "text-purple-400" },
  negocio: { label: "Negocio", color: "text-blue-400" },
  empresa: { label: "Empresa", color: "text-primary" },
}

export function DashboardTopbar({
  store,
  user,
  role,
}: {
  store: Store
  user: UserType | null
  role: Role
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

  const planType = store.planType || store.plan
  const planInfo = planLabels[planType] || planLabels.tienda
  const [storeUrl, setStoreUrl] = useState("")
  useEffect(() => { setStoreUrl(`${window.location.origin}/store/${store.slug}`) }, [store.slug])

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl)
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
          {/* Plan badge */}
          <Link
            href="/pricing"
            className="hidden items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition-all hover:bg-primary/20 md:flex"
          >
            <Crown className="size-3.5" />
            {planInfo.label}
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
        storeUrl={storeUrl}
        storeName={store.name}
      />
    </>
  )
}
