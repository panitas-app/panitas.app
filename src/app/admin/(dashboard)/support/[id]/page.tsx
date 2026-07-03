"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { format } from "date-fns"
import { ArrowLeft, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface TicketDetail {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  user: { id: string; name: string | null; email: string | null }
  messages: Array<{ id: string; senderType: string; content: string; createdAt: string; sender: { name: string | null } | null }>
}

export default function AdminSupportTicketPage() {
  const params = useParams()
  const id = params?.id as string

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/support/tickets/${id}`).then(r => r.json()).then(d => { setTicket(d); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  async function handleReply() {
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch(`/api/admin/support/tickets/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply }),
    })
    if (res.ok) {
      toast.success("Respuesta enviada")
      setReply("")
      const updated = await res.json()
      setTicket(updated)
    } else {
      toast.error("Error al enviar")
    }
    setSending(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Cargando...</div>
  if (!ticket) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/support"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">{ticket.user.name || ticket.user.email} · {format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm")}</p>
        </div>
        <Badge>{ticket.status}</Badge>
        <Badge variant="outline">{ticket.priority}</Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {ticket.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin mensajes</p>
          ) : (
            ticket.messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.senderType === "admin" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-xl px-4 py-2", msg.senderType === "admin" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-60">{msg.senderType === "admin" ? "Tú" : ticket.user.name || ticket.user.email} · {format(new Date(msg.createdAt), "HH:mm")}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escribe tu respuesta..." rows={2} className="flex-1" />
        <Button onClick={handleReply} disabled={sending || !reply.trim()} className="gap-2">
          <Send className="size-4" /> {sending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  )
}
