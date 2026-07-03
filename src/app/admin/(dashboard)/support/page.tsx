"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Ticket {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  user: { name: string | null; email: string | null }
}

export default function AdminSupportPage() {
  const router = useRouter()
  const [data, setData] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/support/tickets").then(r => r.json()).then(d => { setData(d.data || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function getStatusColor(s: string) {
    const map: Record<string, string> = { open: "bg-green-100 text-green-700", in_progress: "bg-blue-100 text-blue-700", resolved: "bg-slate-100 text-slate-500", closed: "bg-slate-100 text-slate-400" }
    return map[s] || "bg-slate-100 text-slate-500"
  }

  function getPriorityColor(p: string) {
    const map: Record<string, string> = { urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-slate-100 text-slate-500" }
    return map[p] || "bg-slate-100 text-slate-500"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Soporte</h1>
        <p className="text-sm text-muted-foreground">Tickets de soporte de usuarios</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asunto</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <MessageCircle className="size-8 text-muted-foreground/50" />
                    <p>Sin tickets de soporte</p>
                  </div>
                </TableCell></TableRow>
              ) : (
                data.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/admin/support/${t.id}`)}>
                    <TableCell className="font-medium text-sm">{t.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.user.name || t.user.email}</TableCell>
                    <TableCell><Badge className={cn("text-xs", getStatusColor(t.status))}>{t.status}</Badge></TableCell>
                    <TableCell><Badge className={cn("text-xs", getPriorityColor(t.priority))}>{t.priority}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(t.createdAt), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
