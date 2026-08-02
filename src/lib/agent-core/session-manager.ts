/**
 * Session Manager (FASE 3A).
 *
 * Gestiona conversaciones por sesión: usuario, negocio, plan, fecha, mensajes,
 * estado e historial. Sin memoria inteligente (eso es fases futuras): esto es el
 * contenedor básico de conversación, desacoplado del almacenamiento.
 */
import type { Conversation, Message, MessageRole, ResolvedToolCall } from "./types"
import type { AgentSession } from "./types"

export type { AgentSession } from "./types"

export type SessionStatus = "active" | "closed"

export interface CreateSessionInput {
  id?: string
  userId: string
  storeId: string
  negocioId?: string | null
  plan?: string
  metadata?: Record<string, unknown>
}

export interface AppendMessageInput {
  role: MessageRole
  content: string
  toolCalls?: ResolvedToolCall[]
}

export interface SessionStore {
  create(session: AgentSession): Promise<AgentSession>
  get(id: string): Promise<AgentSession | null>
  update(id: string, patch: Partial<AgentSession>): Promise<AgentSession | null>
  listByUser(userId: string): Promise<AgentSession[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

/** Store en memoria (in-process). Reemplazable en el futuro por persistencia en BD. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, AgentSession>()

  async create(session: AgentSession): Promise<AgentSession> {
    this.sessions.set(session.id, session)
    return session
  }

  async get(id: string): Promise<AgentSession | null> {
    return this.sessions.get(id) ?? null
  }

  async update(id: string, patch: Partial<AgentSession>): Promise<AgentSession | null> {
    const current = this.sessions.get(id)
    if (!current) return null
    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() }
    this.sessions.set(id, updated)
    return updated
  }

  async listByUser(userId: string): Promise<AgentSession[]> {
    return [...this.sessions.values()].filter((s) => s.userId === userId)
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id)
  }

  async clear(): Promise<void> {
    this.sessions.clear()
  }
}

function makeMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export class SessionManager {
  constructor(private readonly store: SessionStore = new InMemorySessionStore()) {}

  async createSession(input: CreateSessionInput): Promise<AgentSession> {
    const now = new Date().toISOString()
    const session: AgentSession = {
      id: input.id ?? `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      userId: input.userId,
      storeId: input.storeId,
      negocioId: input.negocioId ?? null,
      plan: input.plan ?? "business",
      status: "active",
      messages: [],
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    }
    return this.store.create(session)
  }

  async getSession(id: string): Promise<AgentSession | null> {
    return this.store.get(id)
  }

  /** Reutiliza la sesión si existe y pertenece al usuario; si no, crea una nueva. */
  async getOrCreateSession(sessionId: string | undefined, input: CreateSessionInput): Promise<AgentSession> {
    if (sessionId) {
      const existing = await this.store.get(sessionId)
      if (existing && existing.userId === input.userId && existing.storeId === input.storeId) {
        return existing
      }
    }
    return this.createSession(input)
  }

  async appendMessage(sessionId: string, input: AppendMessageInput): Promise<AgentSession | null> {
    const message: Message = {
      id: makeMessageId(),
      role: input.role,
      content: input.content,
      timestamp: new Date().toISOString(),
      toolCalls: input.toolCalls,
    }
    const session = await this.store.get(sessionId)
    if (!session) return null
    return this.store.update(sessionId, { messages: [...session.messages, message] })
  }

  async closeSession(id: string): Promise<AgentSession | null> {
    return this.store.update(id, { status: "closed" })
  }

  async getHistory(id: string): Promise<Message[]> {
    const session = await this.store.get(id)
    return session ? session.messages : []
  }

  async listSessions(userId: string): Promise<AgentSession[]> {
    return this.store.listByUser(userId)
  }

  async deleteSession(id: string): Promise<void> {
    return this.store.delete(id)
  }

  toConversation(session: AgentSession): Conversation {
    return {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages,
      metadata: session.metadata,
    }
  }
}
