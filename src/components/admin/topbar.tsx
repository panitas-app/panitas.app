"use client"

import { useState } from "react"
import Link from "next/link"
import { LogOut, Shield, User, ChevronDown, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminTopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "A"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border/10 bg-background/80 backdrop-blur-xl px-6">
      <Link href="/admin" className="flex items-center gap-2 font-heading text-base font-bold">
        <Shield className="size-5 text-primary" />
        <span>PANITAS <span className="text-xs font-normal text-muted-foreground">Admin</span></span>
      </Link>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full outline-none hover:opacity-85 transition-opacity cursor-pointer">
                <Avatar size="sm" className="ring-2 ring-white/10">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="bg-muted text-foreground/70 font-extrabold text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground/80">{user.name || user.email}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48 rounded-2xl border border-border/10 bg-white/98 backdrop-blur-2xl p-2 shadow-2xl">
            <DropdownMenuLabel className="px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50 my-1" />
            <DropdownMenuItem className="rounded-xl px-3 py-2.5 text-xs font-medium text-foreground/70 hover:bg-muted hover:text-foreground cursor-pointer flex items-center gap-2">
              <User className="size-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50 my-1" />
            <Link href="/api/auth/signout">
              <DropdownMenuItem className="rounded-xl px-3 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer flex items-center gap-2">
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
