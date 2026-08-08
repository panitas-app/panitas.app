"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCheck, History, MessageCircleReply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatDate, LEVEL_META, STATUS_META, type ContactLog } from "./collection-types"
import { cn } from "@/lib/utils"

interface ContactHistoryProps {
  orderId: string
  refreshKey?: number
  onChanged?: () => void
}

export function ContactHistory({ orderId, refreshKey = 0, onChanged }: ContactHistoryProps) {
  const [contacts, setContacts] = useState<ContactLog[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    if (!orderId) return
    try {
      const res = await fetch(`/api/collection/contacts?orderId=${orderId}&limit=30`)
      if (!res.ok) throw new Error("Error al cargar historial")
      const data = await res.json()
      setContacts(data.contacts)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar historial")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    setLoading(true)
    fetchHistory()
  }, [fetchHistory, refreshKey])

  async function mark(id: string, status: "sent" | "responded") {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/collection/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: id, status }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al actualizar")
      }
      toast.success(status === "sent" ? "Marcado como enviado" : "Marcado como respondido")
      await fetchHistory()
      onChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Cargando historial...</p>
  }

  if (contacts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center inline-flex items-center justify-center gap-1.5">
        <History className="size-3.5" /> Aún no hay contactos registrados para este crédito.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => {
        const statusMeta = STATUS_META[contact.status]
        const levelMeta = LEVEL_META[contact.level]
        return (
          <div key={contact.id} className="rounded-xl border p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", statusMeta.chip)}>
                {statusMeta.label}
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", levelMeta.chip)}>
                Nivel {contact.level} · {levelMeta.label}
              </span>
              {contact.templateName && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {contact.templateName}
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground">{formatDate(contact.createdAt)}</span>
            </div>
            {contact.message && <p className="text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{contact.message}</p>}
            {contact.status !== "responded" && (
              <div className="flex gap-2">
                {contact.status !== "sent" && (
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={updatingId === contact.id} onClick={() => mark(contact.id, "sent")}>
                    <CheckCheck /> Marcar enviado
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={updatingId === contact.id} onClick={() => mark(contact.id, "responded")}>
                  <MessageCircleReply /> Marcar respondido
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
