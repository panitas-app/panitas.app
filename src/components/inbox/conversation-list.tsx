"use client"

import { useEffect, useState } from "react"
import { Search, MessageSquare, Plus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FilterChip } from "@/components/ui/filter-chip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  INBOX_CHANNEL_META,
  INBOX_CHANNEL_TYPES,
  INBOX_STATUS_META,
  INBOX_STATUSES,
  type InboxChannelDTO,
  type InboxConversationSummary,
  type InboxTagDTO,
} from "@/lib/inbox/conversation-types"
import { createConversation, type InboxFilters } from "./api"

interface ConversationListProps {
  conversations: InboxConversationSummary[]
  loading: boolean
  total: number
  channels: InboxChannelDTO[]
  tags: InboxTagDTO[]
  filters: InboxFilters
  onFiltersChange: (filters: InboxFilters) => void
  selectedId: string | null
  onSelect: (conversation: InboxConversationSummary) => void
  onCreateConversation?: (conversation: InboxConversationSummary) => void
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

export function ConversationList({
  conversations,
  loading,
  total,
  channels,
  tags,
  filters,
  onFiltersChange,
  selectedId,
  onSelect,
  onCreateConversation,
}: ConversationListProps) {
  const [search, setSearch] = useState(filters.search)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ channelType: "whatsapp", customerName: "", customerPhone: "", initialMessage: "" })

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.search) onFiltersChange({ ...filters, search })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const setStatus = (status: string) => onFiltersChange({ ...filters, status })
  const setChannel = (channel: string) => onFiltersChange({ ...filters, channel })
  const setTag = (tag: string) => {
    if (tag === "all") onFiltersChange({ ...filters, tag: "" })
    else onFiltersChange({ ...filters, tag })
  }

  const selectableChannels =
    channels.length > 0
      ? channels.map((channel) => ({ value: channel.type, name: channel.name }))
      : INBOX_CHANNEL_TYPES.map((type) => ({ value: type, name: INBOX_CHANNEL_META[type].name }))

  async function handleCreate() {
    if (!form.customerName.trim() && !form.customerPhone.trim()) return
    setSaving(true)
    try {
      const detail = await createConversation({
        channelType: form.channelType,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        initialMessage: form.initialMessage.trim(),
      })
      setForm({ channelType: "whatsapp", customerName: "", customerPhone: "", initialMessage: "" })
      setCreating(false)
      onCreateConversation?.({
        id: detail.id,
        title: detail.title,
        channelType: detail.channelType,
        channelName: detail.channelName,
        status: detail.status,
        priority: detail.priority,
        unreadCount: detail.unreadCount,
        isPinned: detail.isPinned,
        customer: detail.customer,
        assignedTo: detail.assignedTo,
        tags: detail.tags,
        lastMessage: detail.lastMessage,
        lastMessageAt: detail.lastMessageAt,
        messageCount: detail.messageCount,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      })
    } catch (error) {
      console.error("[inbox] no se pudo crear la conversación", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 pt-3 pb-2">
        <h2 className="text-sm font-bold">Conversaciones</h2>
        <Button size="xs" variant="outline" onClick={() => setCreating((prev) => !prev)} className="gap-1">
          {creating ? <X className="size-3" /> : <Plus className="size-3" />}
          {creating ? "Cancelar" : "Nuevo chat"}
        </Button>
      </div>

      {creating && (
        <form
          className="space-y-2 border-b p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void handleCreate()
          }}
        >
          <Select
            value={form.channelType}
            onValueChange={(value) => setForm((prev) => ({ ...prev, channelType: value ?? "whatsapp" }))}
          >
            <SelectTrigger size="sm" className="h-9 w-full">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              {selectableChannels.map((channel) => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={form.customerName}
            onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
            placeholder="Nombre del cliente"
            className="h-9"
          />
          <Input
            value={form.customerPhone}
            onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
            placeholder="Teléfono (se asocia al CRM)"
            className="h-9"
          />
          <Input
            value={form.initialMessage}
            onChange={(e) => setForm((prev) => ({ ...prev, initialMessage: e.target.value }))}
            placeholder="Mensaje inicial (opcional)"
            className="h-9"
          />
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={saving || (!form.customerName.trim() && !form.customerPhone.trim())}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Crear conversación
          </Button>
        </form>
      )}

      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o teléfono..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="Todas" active={filters.status === "all"} onClick={() => setStatus("all")} />
          {INBOX_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={INBOX_STATUS_META[status].label}
              active={filters.status === status}
              onClick={() => setStatus(status)}
              onRemove={filters.status === status ? () => setStatus("all") : undefined}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Select value={filters.channel} onValueChange={(value) => setChannel(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-full">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los canales</SelectItem>
              {selectableChannels.map((channel) => (
                <SelectItem key={channel.value} value={channel.value}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.tag || "all"} onValueChange={(value) => setTag(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-full">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etiquetas</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.name}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-xs text-muted-foreground">
        <span>
          {total} conversacion{total === 1 ? "" : "es"}
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex justify-center py-10 text-sm text-muted-foreground">Cargando...</div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sin conversaciones"
            description="Las conversaciones de tus clientes aparecerán aquí cuando lleguen por cualquier canal."
          />
        ) : (
          <ul className="divide-y">
            {conversations.map((conversation) => {
              const channelMeta = INBOX_CHANNEL_META[conversation.channelType] ?? INBOX_CHANNEL_META.other
              const initials = (conversation.customer?.name ?? conversation.title ?? "?")
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word.charAt(0).toUpperCase())
                .join("")
              const selected = selectedId === conversation.id
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation)}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-accent/50",
                      selected && "bg-accent",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback
                          style={{ backgroundColor: channelMeta.color, color: "#fff", fontSize: "0.8rem" }}
                        >
                          {initials || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-background">
                          {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", conversation.unreadCount > 0 ? "font-bold" : "font-semibold")}>
                          {conversation.customer?.name ?? conversation.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: channelMeta.color }} />
                        <span className="truncate text-xs text-muted-foreground">
                          {conversation.lastMessage || "Sin mensajes todavía"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {channelMeta.name}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {INBOX_STATUS_META[conversation.status].label}
                        </Badge>
                        {conversation.priority === "alta" || conversation.priority === "urgente" ? (
                          <Badge variant="destructive" className="text-[10px]">
                            {conversation.priority}
                          </Badge>
                        ) : null}
                        {conversation.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
