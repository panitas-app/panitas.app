"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ShoppingCart, BarChart3, Receipt, LogOut, Store } from "lucide-react"

interface Props {
  seller: { name: string; storeName: string }
}

export function SellerSidebar({ seller }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const items = [
    { href: "/seller/panel", label: "Mis Ventas", icon: BarChart3 },
    { href: "/seller/panel/ventas", label: "Nueva Venta", icon: ShoppingCart },
    { href: "/seller/panel/comisiones", label: "Comisiones", icon: Receipt },
  ]

  async function logout() {
    await fetch("/api/seller/logout", { method: "POST" })
    router.push("/seller/login")
  }

  return (
    <aside className="flex w-56 flex-col bg-[#0A1628] text-white p-4">
      <div className="mb-8 flex items-center gap-2 px-2 py-3">
        <Store className="size-5 text-primary" />
        <div className="truncate">
          <p className="text-xs font-bold text-primary">{seller.storeName}</p>
          <p className="text-[10px] text-slate-500 truncate">{seller.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 rounded-xl py-5 text-slate-400 hover:text-white hover:bg-white/5",
                  isActive && "bg-primary/10 text-primary font-bold hover:text-primary"
                )}
              >
                <item.icon className="size-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <Button
        variant="ghost"
        onClick={logout}
        className="w-full justify-start gap-3 rounded-xl py-5 text-slate-500 hover:text-red-400 hover:bg-white/5"
      >
        <LogOut className="size-4" />
        <span className="text-sm">Cerrar sesión</span>
      </Button>
    </aside>
  )
}
