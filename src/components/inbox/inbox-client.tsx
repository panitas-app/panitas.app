"use client"

import { useCallback, useEffect, useState } from "react"
import { MessageCircle, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import type {
  InboxChannelDTO,
  InboxConversationDetail,
  InboxConversationSummary,
  InboxCustomerContext,
  InboxMessageDTO,
  InboxTagDTO,
} from "@/lib/inbox/conversation-types"
import { ConversationList } from "./conversation-list"
import { ConversationThread } from "./conversation-thread"
import { CustomerContext } from "./customer-context"
import { getChannels, getContext, getConversation, getTags, listConversations, markRead, type InboxFilters } from "./api"

type View = "list" | "thread" | "context"

export function InboxClient() {
  const [conversations, setConversations] = useState<InboxConversationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<InboxChannelDTO[]>([])
  const [tags, setTags] = useState<InboxTagDTO[]>([])
  const [filters, setFilters] = useState<InboxFilters>({ status: "all", channel: "all", tag: "", search: "" })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null)
  const [context, setContext] = useState<InboxCustomerContext | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [view, setView] = useState<View>("list")

  const refreshList = useCallback(
    async (currentFilters = filters) => {
      setLoading(true)
      try {
        const result = await listConversations(currentFilters)
        setConversations(result.conversations)
        setTotal(result.total)
        setError(null)
      } catch (e) {
        console.error("[inbox] error al cargar lista", e)
        setError(e instanceof Error ? e.message : "No se pudo cargar la bandeja")
      } finally {
        setLoading(false)
      }
    },
    [filters],
  )

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const [nextDetail, nextContext] = await Promise.all([getConversation(id), getContext(id)])
      setDetail(nextDetail)
      setContext(nextContext)
    } catch (e) {
      console.error("[inbox] error al cargar conversación", e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [channelRes, tagRes] = await Promise.all([getChannels(), getTags()])
        if (cancelled) return
        setChannels(channelRes.channels)
        setTags(tagRes.tags)
      } catch (e) {
        console.error("[inbox] error al cargar catálogo", e)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial de la bandeja
    void refreshList()
  }, [refreshList])

  async function handleSelect(conversation: InboxConversationSummary) {
    setSelectedId(conversation.id)
    setView("thread")
    void loadDetail(conversation.id)
    try {
      await markRead(conversation.id)
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)),
      )
    } catch (e) {
      console.error("[inbox] no se pudo marcar como leído", e)
    }
  }

  async function handleDataChange() {
    if (!selectedId) return
    await Promise.all([loadDetail(selectedId), refreshList()])
  }

  function handleMessageSent(message: InboxMessageDTO) {
    setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev))
    setConversations((prev) =>
      prev.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: message.content.slice(0, 120),
              lastMessageAt: message.createdAt,
              messageCount: c.messageCount + 1,
            }
          : c,
      ),
    )
  }

  async function handleNoteAdded() {
    if (!selectedId) return
    try {
      const nextContext = await getContext(selectedId)
      setContext(nextContext)
    } catch (e) {
      console.error("[inbox] no se pudo refrescar el contexto", e)
    }
  }

  function handleCreate(conversation: InboxConversationSummary) {
    setConversations((prev) => [conversation, ...prev])
    setTotal((prev) => prev + 1)
    void handleSelect(conversation)
  }

  const panelClass = (active: View) => (view === active ? "block" : "hidden lg:block")

  return (
    <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)_340px]">
      <div className={cn("h-full overflow-hidden rounded-xl border bg-card", panelClass("list"))}>
        <ConversationList
          conversations={conversations}
          loading={loading}
          total={total}
          channels={channels}
          tags={tags}
          filters={filters}
          onFiltersChange={setFilters}
          selectedId={selectedId}
          onSelect={handleSelect}
          onCreateConversation={handleCreate}
        />
      </div>

      <div className={cn("h-full overflow-hidden rounded-xl border bg-card", panelClass("thread"))}>
        {error ? (
          <EmptyState title="Error al cargar la bandeja" description={error} />
        ) : detailLoading && !detail ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando conversación...</div>
        ) : detail ? (
          <ConversationThread
            detail={detail}
            onBack={() => setView("list")}
            onOpenContext={() => setView("context")}
            onDataChange={() => void handleDataChange()}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="Selecciona una conversación"
            description="Elige un chat de la lista para leer y responder a tus clientes."
          />
        )}
      </div>

      <div className={cn("h-full overflow-hidden rounded-xl border bg-card", panelClass("context"))}>
        {detail && selectedId ? (
          context ? (
            <CustomerContext
              context={context}
              conversationId={selectedId}
              onBack={() => setView("thread")}
              onNoteAdded={() => void handleNoteAdded()}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Button variant="ghost" onClick={() => void handleDataChange()} className="gap-1">
                <UserRound className="size-4" />
                Cargar contexto
              </Button>
            </div>
          )
        ) : (
          <EmptyState
            icon={UserRound}
            title="Contexto del cliente"
            description="Pedidos, créditos, notas y recomendaciones de Panitas aparecerán aquí."
          />
        )}
      </div>
    </div>
  )
}
