"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ShoppingCart, BarChart3, Receipt, LogOut, Store, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
  seller: { name: string; storeName: string }
}

export function SellerSidebar({ seller }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])

  const items = [
    { href: "/seller/panel", label: "Mis Ventas", icon: BarChart3 },
    { href: "/seller/panel/ventas", label: "Nueva Venta", icon: ShoppingCart },
    { href: "/seller/panel/comisiones", label: "Comisiones", icon: Receipt },
  ]

  async function logout() {
    await fetch("/api/seller/logout", { method: "POST" })
    router.push("/seller/login")
  }

  const navContent = (
    <nav className="flex-1 space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link key={item.href} href={item.href} onClick={closeMobile}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 rounded-xl min-h-[44px] text-slate-400 hover:text-white hover:bg-white/5",
                isActive && "bg-primary/10 text-primary font-bold hover:text-primary"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="text-sm truncate">{item.label}</span>
            </Button>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      <aside className="hidden lg:flex w-56 flex-col bg-[#0A1628] text-white p-4 shrink-0">
        <div className="mb-8 flex items-center gap-2 px-2 py-3 min-w-0">
          <Store className="size-5 shrink-0 text-primary" />
          <div className="truncate min-w-0">
            <p className="text-xs font-bold text-primary truncate">{seller.storeName}</p>
            <p className="text-[10px] text-slate-500 truncate">{seller.name}</p>
          </div>
        </div>
        {navContent}
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 rounded-xl min-h-[44px] text-slate-500 hover:text-red-400 hover:bg-white/5"
        >
          <LogOut className="size-4 shrink-0" />
          <span className="text-sm">Cerrar sesión</span>
        </Button>
      </aside>

      <button
        onClick={openMobile}
        className="fixed top-3 left-3 z-50 lg:hidden touch-target rounded-xl bg-[#0A1628] text-white border border-white/10"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeMobile}
              className="fixed inset-0 z-40 perf-overlay"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[75vw] max-w-[300px] bg-[#0A1628] text-white p-4 shadow-2xl safe-bottom gpu will-change-transform"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="size-5 shrink-0 text-primary" />
                  <div className="truncate min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{seller.storeName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{seller.name}</p>
                  </div>
                </div>
                <button
                  onClick={closeMobile}
                  className="touch-target rounded-full bg-white/10 text-white"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>
              {navContent}
              <div className="mt-auto pt-4">
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="w-full justify-start gap-3 rounded-xl min-h-[44px] text-slate-500 hover:text-red-400 hover:bg-white/5"
                >
                  <LogOut className="size-4 shrink-0" />
                  <span className="text-sm">Cerrar sesión</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}