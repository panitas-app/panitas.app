import { describe, expect, it } from "vitest"
import { SessionManager, InMemorySessionStore } from "@/lib/agent-core/session-manager"

function makeManager(store = new InMemorySessionStore()) {
  return new SessionManager(store)
}

describe("SessionManager", () => {
  it("crea una sesión con usuario, negocio, plan y fechas", async () => {
    const manager = makeManager()
    const session = await manager.createSession({
      userId: "u1",
      storeId: "s1",
      negocioId: "n1",
      plan: "business_plus",
    })
    expect(session.userId).toBe("u1")
    expect(session.storeId).toBe("s1")
    expect(session.negocioId).toBe("n1")
    expect(session.plan).toBe("business_plus")
    expect(session.status).toBe("active")
    expect(session.messages).toEqual([])
    expect(session.createdAt).toBeDefined()
  })

  it("getOrCreateSession reutiliza si pertenece al usuario/tienda", async () => {
    const manager = makeManager()
    const created = await manager.createSession({ userId: "u1", storeId: "s1" })
    const reused = await manager.getOrCreateSession(created.id, { userId: "u1", storeId: "s1" })
    expect(reused.id).toBe(created.id)

    const other = await manager.getOrCreateSession(created.id, { userId: "u2", storeId: "s1" })
    expect(other.id).not.toBe(created.id)
    expect(other.userId).toBe("u2")
  })

  it("appendMessage agrega mensajes con id y timestamp", async () => {
    const manager = makeManager()
    const session = await manager.createSession({ userId: "u1", storeId: "s1" })
    await manager.appendMessage(session.id, { role: "user", content: "hola" })
    const history = await manager.getHistory(session.id)
    expect(history).toHaveLength(1)
    expect(history[0].content).toBe("hola")
    expect(history[0].role).toBe("user")
    expect(history[0].id).toBeDefined()
    expect(history[0].timestamp).toBeDefined()
  })

  it("cambia estado a closed con closeSession", async () => {
    const manager = makeManager()
    const session = await manager.createSession({ userId: "u1", storeId: "s1" })
    const closed = await manager.closeSession(session.id)
    expect(closed?.status).toBe("closed")
  })

  it("listSessions filtra por usuario", async () => {
    const manager = makeManager()
    await manager.createSession({ userId: "u1", storeId: "s1" })
    await manager.createSession({ userId: "u1", storeId: "s1" })
    await manager.createSession({ userId: "u2", storeId: "s1" })
    const sessions = await manager.listSessions("u1")
    expect(sessions).toHaveLength(2)
  })

  it("toConversation expone mensajes y metadatos", async () => {
    const manager = makeManager()
    const session = await manager.createSession({ userId: "u1", storeId: "s1", metadata: { source: "panel" } })
    await manager.appendMessage(session.id, { role: "user", content: "x" })
    const fresh = await manager.getSession(session.id)
    const conversation = manager.toConversation(fresh!)
    expect(conversation.id).toBe(session.id)
    expect(conversation.messages).toHaveLength(1)
    expect(conversation.metadata?.source).toBe("panel")
  })
})
