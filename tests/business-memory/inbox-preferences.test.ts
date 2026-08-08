import { describe, expect, it, beforeEach } from "vitest"
import { createTestEngine, ctx, otherStoreCtx } from "./helpers"
import {
  readInboxPreferences,
  recordInboxUsage,
  saveInboxSort,
  INBOX_PREF_CHANNELS_KEY,
  INBOX_PREF_TAGS_KEY,
  INBOX_PREF_IMPORTANT_KEY,
  INBOX_PREF_SORT_KEY,
} from "@/lib/business-memory/inbox-preferences"

describe("inbox-preferences (FASE 7A)", () => {
  let engine: ReturnType<typeof createTestEngine>

  beforeEach(() => {
    engine = createTestEngine()
  })

  it("devuelve valores por defecto sin preferencias", async () => {
    const prefs = await readInboxPreferences(engine, ctx)
    expect(prefs).toEqual({
      favoriteChannels: [],
      usedTags: [],
      importantConversations: [],
      sort: "recientes",
    })
  })

  it("aprende el canal favorito por repetición bajo claves bm.preference.inbox.*", async () => {
    await recordInboxUsage(engine, ctx, { channel: "whatsapp" })
    const item = await engine.get(ctx, INBOX_PREF_CHANNELS_KEY)
    expect(item?.key).toBe("bm.preference.inbox.canales")
    expect(item?.metadata.tags).toContain("centro de conversaciones")
    const prefs = await readInboxPreferences(engine, ctx)
    expect(prefs.favoriteChannels).toContain("whatsapp")
  })

  it("acumula canales y etiquetas usadas sin duplicar", async () => {
    await recordInboxUsage(engine, ctx, { channel: "whatsapp", tag: "venta" })
    await recordInboxUsage(engine, ctx, { channel: "whatsapp", tag: "soporte" })
    const prefs = await readInboxPreferences(engine, ctx)
    expect(prefs.favoriteChannels).toEqual(["whatsapp"])
    expect(prefs.usedTags).toEqual(["soporte", "venta"])
  })

  it("aprende conversaciones importantes", async () => {
    await recordInboxUsage(engine, ctx, { conversationId: "conv-1" })
    const prefs = await readInboxPreferences(engine, ctx)
    expect(prefs.importantConversations).toContain("conv-1")
    const item = await engine.get(ctx, INBOX_PREF_IMPORTANT_KEY)
    expect(item?.kind).toBe("preference")
  })

  it("guarda explícitamente la preferencia de atención con importancia LOW", async () => {
    await saveInboxSort(engine, ctx, "no_leidas")
    const prefs = await readInboxPreferences(engine, ctx)
    expect(prefs.sort).toBe("no_leidas")
    const item = await engine.get(ctx, INBOX_PREF_SORT_KEY)
    expect(item?.status).toBe("confirmed")
    expect(item?.importance).toBe("LOW")
  })

  it("no reescribe el orden si ya coincide", async () => {
    await saveInboxSort(engine, ctx, "pendientes")
    const before = (await engine.get(ctx, INBOX_PREF_SORT_KEY))?.updatedAt
    await saveInboxSort(engine, ctx, "pendientes")
    const after = (await engine.get(ctx, INBOX_PREF_SORT_KEY))?.updatedAt
    expect(after).toBe(before)
  })

  it("aísla las preferencias por store", async () => {
    await saveInboxSort(engine, ctx, "no_leidas")
    await recordInboxUsage(engine, ctx, { channel: "instagram" })
    const other = await readInboxPreferences(engine, otherStoreCtx)
    expect(other.favoriteChannels).toEqual([])
    expect(other.sort).toBe("recientes")
  })
})
