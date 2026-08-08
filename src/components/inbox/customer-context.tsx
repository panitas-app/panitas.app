"use client"

import { useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  UserRound,
} from "lucide-react"
import { formatPrice, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import type { InboxCustomerContext, InboxRecommendation, RecommendationTone } from "@/lib/inbox/conversation-types"
import { addNote } from "./api"

interface CustomerContextProps {
  context: InboxCustomerContext
  conversationId: string
  onBack: () => void
  onNoteAdded: () => void
}

const TONE_STYLES: Record<RecommendationTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  default: "border-border bg-muted text-muted-foreground",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-3">
      <h3 className="mb-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  )
}

function RecommendationCard({ recommendation }: { recommendation: InboxRecommendation }) {
  return (
    <div className={cn("rounded-xl border p-3", TONE_STYLES[recommendation.tone])}>
      <p className="text-sm font-semibold">{recommendation.title}</p>
      <p className="mt-1 text-xs opacity-90">{recommendation.description}</p>
      <p className="mt-2 flex items-start gap-1.5 text-xs">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
        <span>{recommendation.action}</span>
      </p>
    </div>
  )
}

export function CustomerContext({ context, conversationId, onBack, onNoteAdded }: CustomerContextProps) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const customer = context.customer

  async function handleAddNote() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await addNote(conversationId, note)
      setNote("")
      onNoteAdded()
    } catch (error) {
      console.error("[inbox] no se pudo guardar la nota", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} className="lg:hidden" aria-label="Volver al chat">
          <ArrowLeft />
        </Button>
        <h2 className="flex items-center gap-1.5 font-semibold">
          <UserRound className="size-4 text-primary" />
          Cliente
        </h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {!customer ? (
          <EmptyState
            icon={UserRound}
            title="Cliente no identificado"
            description="Esta conversación aún no está asociada a un cliente del CRM. La asociación se hará automáticamente al recibir un teléfono."
          />
        ) : (
          <>
            <Section title="Información">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{customer.name}</p>
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" />
                      {customer.phone}
                    </span>
                    {customer.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-muted p-2">
                  <p className="text-lg font-black">{customer.totalOrders}</p>
                  <p className="text-[10px] text-muted-foreground">Órdenes</p>
                </div>
                <div className="rounded-xl bg-muted p-2">
                  <p className="text-lg font-black">{formatPrice(customer.totalSpent)}</p>
                  <p className="text-[10px] text-muted-foreground">Total gastado</p>
                </div>
              </div>
              {customer.lastPurchaseAt && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="size-3" />
                  Última compra: {new Date(customer.lastPurchaseAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {customer.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Section>

            {context.aiRecommendations.length > 0 && (
              <Section title="Panitas IA — recomendaciones">
                <div className="space-y-2">
                  {context.aiRecommendations.map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                  ))}
                </div>
              </Section>
            )}

            <Section title="Créditos">
              {context.credits.activeCredits === 0 ? (
                <p className="text-xs text-muted-foreground">Sin créditos activos.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CreditCard className="size-3" />
                      Créditos activos
                    </span>
                    <span>{context.credits.activeCredits}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Por pagar</span>
                    <span>{formatPrice(context.credits.pendingAmount)}</span>
                  </p>
                  {context.credits.overdueAmount > 0 && (
                    <p className="flex items-center justify-between text-red-600">
                      <span className="text-xs">Vencido</span>
                      <span className="font-bold">{formatPrice(context.credits.overdueAmount)}</span>
                    </p>
                  )}
                  {context.credits.nextDueDate && (
                    <p className="text-[11px] text-muted-foreground">
                      Próximo vencimiento: {new Date(context.credits.nextDueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              )}
            </Section>

            <Section title="Últimos pedidos">
              {context.orders.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin pedidos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {context.orders.map((order) => (
                    <li key={order.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <ShoppingBag className="size-3" />
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-bold">{formatPrice(order.total)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{order.status}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                      </div>
                      {order.items.length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {order.items.map((item) => `${item.productName} ×${item.quantity}`).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {context.favoriteProducts.length > 0 && (
              <Section title="Productos favoritos">
                <ul className="space-y-1.5">
                  {context.favoriteProducts.map((product, index) => (
                    <li key={`${product.productId ?? product.productName}-${index}`} className="flex items-center gap-2 text-sm">
                      <Star className="size-3.5 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate">{product.productName}</span>
                      <span className="text-xs text-muted-foreground">×{product.quantity}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Interacciones recientes">
              {context.recentInteractions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin interacciones previas.</p>
              ) : (
                <ul className="space-y-2">
                  {context.recentInteractions.map((interaction, index) => (
                    <li key={index} className="rounded-lg bg-muted/50 p-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          {interaction.channel}
                        </span>
                        <span>{new Date(interaction.createdAt).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="mt-1 text-xs">{interaction.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Notas">
              {context.notes.length === 0 ? (
                <p className="mb-2 text-xs text-muted-foreground">Sin notas internas.</p>
              ) : (
                <ul className="mb-3 space-y-2">
                  {context.notes.slice(0, 5).map((noteItem, index) => (
                    <li key={index} className="rounded-lg border p-2">
                      <p className="text-xs">{noteItem.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {noteItem.type === "customer" ? "Nota del cliente" : "Nota de la conversación"} ·{" "}
                        {new Date(noteItem.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Agregar nota interna..."
                  className="h-9 flex-1 rounded-lg border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddNote()
                  }}
                />
                <Button size="sm" onClick={() => void handleAddNote()} disabled={saving || !note.trim()}>
                  <Tag className="size-3.5" />
                </Button>
              </div>
            </Section>
          </>
        )}
      </ScrollArea>
    </div>
  )
}
