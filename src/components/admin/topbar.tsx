"use client"

import Link from "next/link"
import { LogOut, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminTopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <Link href="/admin" className="flex items-center gap-2 font-heading text-base font-bold">
        <Shield className="size-5 text-primary" />
        <span>PANITAS <span className="text-xs font-normal text-muted-foreground">Admin</span></span>
      </Link>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-muted-foreground">{user.name || user.email}</span>
        <Link href="/api/auth/signout">
          <Button variant="ghost" size="icon" className="size-8">
            <LogOut className="size-4" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
