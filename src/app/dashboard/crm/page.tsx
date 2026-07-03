"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, UserPlus, Mail, Phone, Calendar, MessageCircle, CheckCircle, Clock, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface CustomerSummary {
  id: string
  name: string
  phone: string
  email: string | null
  totalOrders: number
  totalSpent: number
  lastPurchaseAt: string | null
  _count?: { customerNotes: number; followUps: number }
}

export default function CrmPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState({ total: 0, recurrentes: 0, inactivos: 0, seguimientos: 0 })

  useEffect(() => {
    async function load() {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/crm/stats"),
      ])
      if (cRes.ok) {
        const data = await cRes.json()
        setCustomers(Array.isArray(data) ? data : data.customers || [])
      }
      if (sRes.ok) setStats(await sRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search
    ? customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : customers

  const inactiveThreshold = new Date()
  inactiveThreshold.setMonth(inactiveThreshold.getMonth() - 3)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-[#102A43]">CRM</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Clientes</p>
            <p className="text-xl font-bold text-[#102A43] mt-1">{stats.total || customers.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Recurrentes</p>
            <p className="text-xl font-bold text-[#102A43] mt-1">{stats.recurrentes || customers.filter((c) => c.totalOrders > 1).length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Seguimientos</p>
            <p className="text-xl font-bold text-[#102A43] mt-1">{stats.seguimientos || 0}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border">
          <CardContent className="p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Inactivos</p>
            <p className="text-xl font-bold text-[#102A43] mt-1">{stats.inactivos || customers.filter((c) => !c.lastPurchaseAt || new Date(c.lastPurchaseAt) < inactiveThreshold).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative mb-4">
        <Input placeholder="Buscar cliente por nombre o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-4 text-sm" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Clock className="size-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Users className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold">No hay clientes registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/dashboard/customers/${c.id}`}>
              <Card className="rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#102A43]">{c.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>
                        {c.email && <span className="flex items-center gap-1"><Mail className="size-3" />{c.email}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#102A43]">{c.totalOrders} pedidos</p>
                      <p className="text-[10px] text-muted-foreground">${c.totalSpent.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
