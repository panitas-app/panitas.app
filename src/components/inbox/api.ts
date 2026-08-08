/**
 * Cliente HTTP tipado del Centro de Conversaciones (FASE 7A).
 * Solo importa tipos puros (sin Prisma) para mantener el bundle del navegador.
 */
import type {
  InboxAiActionKind,
  InboxAiResult,
  InboxChannelDTO,
  InboxConversationDetail,
  InboxConversationSummary,
  InboxCustomerContext,
  InboxMessageDTO,
  InboxNoteDTO,
  InboxPriority,
  InboxSender,
  InboxStatus,
  InboxTagDTO,
} from "@/lib/inbox/conversation-types"
import type { CopilotAnalysis, CopilotQueryAnswer } from "@/lib/conversation-ai/conversation-types"

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = "Error de red"
    try {
      const json = (await res.json()) as { error?: string }
      if (json.error) message = json.error
    } catch {
      /* cuerpo no JSON */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface InboxFilters {
  status: string
  channel: string
  tag: string
  search: string
}

export function listConversations(filters: InboxFilters): Promise<{
  conversations: InboxConversationSummary[]
  total: number
}> {
  const params = new URLSearchParams()
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.channel && filters.channel !== "all") params.set("channel", filters.channel)
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.search.trim()) params.set("search", filters.search.trim())
  return request(`/api/inbox?${params.toString()}`)
}

export function getConversation(id: string): Promise<InboxConversationDetail> {
  return request(`/api/inbox/${id}`)
}

export function getContext(id: string): Promise<InboxCustomerContext> {
  return request(`/api/inbox/${id}/context`)
}

export function getChannels(): Promise<{ channels: InboxChannelDTO[] }> {
  return request("/api/inbox/channels")
}

export function getTags(): Promise<{ tags: InboxTagDTO[] }> {
  return request("/api/inbox/tags")
}

export function createConversation(body: {
  channelType: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  identifier?: string
  initialMessage?: string
}): Promise<InboxConversationDetail> {
  return request("/api/inbox", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function sendMessage(
  id: string,
  body: {
    sender: InboxSender
    content: string
    contentType?: string
    attachments?: Array<{ type: string; url: string; name?: string; size?: number }>
  },
): Promise<InboxMessageDTO> {
  return request(`/api/inbox/${id}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function markRead(id: string): Promise<{ success: boolean }> {
  return request(`/api/inbox/${id}/read`, { method: "POST", body: "{}" })
}

export function patchConversation(
  id: string,
  patch: { status?: InboxStatus; priority?: InboxPriority; isPinned?: boolean; title?: string },
): Promise<InboxConversationDetail> {
  return request(`/api/inbox/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
}

export function addTag(id: string, name: string): Promise<{ tags: InboxTagDTO[] }> {
  return request(`/api/inbox/${id}/tags`, { method: "POST", body: JSON.stringify({ name }) })
}

export function removeTag(id: string, tagId: string): Promise<{ success: boolean }> {
  return request(`/api/inbox/${id}/tags/${tagId}`, { method: "DELETE" })
}

export function addNote(id: string, content: string): Promise<InboxNoteDTO> {
  return request(`/api/inbox/${id}/notes`, { method: "POST", body: JSON.stringify({ content }) })
}

export function aiAction(
  id: string,
  action: InboxAiActionKind,
  query?: string,
): Promise<InboxAiResult> {
  return request(`/api/inbox/${id}/ai`, {
    method: "POST",
    body: JSON.stringify({ action, query }),
  })
}

export function getCopilotAnalysis(id: string): Promise<{ analysis: CopilotAnalysis }> {
  return request(`/api/inbox/${id}/copilot`)
}

export function refreshCopilotAnalysis(id: string): Promise<{ analysis: CopilotAnalysis }> {
  return request(`/api/inbox/${id}/copilot`, {
    method: "POST",
    body: JSON.stringify({ action: "analyze" }),
  })
}

export function askCopilot(id: string, question: string): Promise<{ answer: CopilotQueryAnswer }> {
  return request(`/api/inbox/${id}/copilot`, {
    method: "POST",
    body: JSON.stringify({ action: "query", question }),
  })
}
