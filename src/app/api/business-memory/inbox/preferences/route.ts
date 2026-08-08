import { NextRequest, NextResponse } from "next/server"
import { getCurrentStore } from "@/lib/permissions"
import {
  createBusinessMemoryEngine,
  readInboxPreferences,
  recordInboxUsage,
  saveInboxSort,
  INBOX_PREF_KEYS,
  INBOX_SORTS,
} from "@/lib/business-memory"
import type { InboxSort } from "@/lib/business-memory"

const VALID_SORTS = new Set<string>(INBOX_SORTS)

const memory = createBusinessMemoryEngine()

export async function GET() {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }
  const prefs = await readInboxPreferences(memory, ctx)
  return NextResponse.json({ prefs, keys: INBOX_PREF_KEYS })
}

export async function POST(request: NextRequest) {
  const current = await getCurrentStore()
  if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    channel?: string
    tag?: string
    conversationId?: string
    sort?: string
  }

  const ctx = { userId: current.userId, storeId: current.store.id, negocioId: undefined }

  await recordInboxUsage(memory, ctx, {
    channel: typeof body.channel === "string" ? body.channel.trim().slice(0, 32) : undefined,
    tag: typeof body.tag === "string" ? body.tag.trim().slice(0, 32) : undefined,
    conversationId:
      typeof body.conversationId === "string" ? body.conversationId.trim().slice(0, 64) : undefined,
  })
  if (typeof body.sort === "string" && VALID_SORTS.has(body.sort)) {
    await saveInboxSort(memory, ctx, body.sort as InboxSort)
  }

  const prefs = await readInboxPreferences(memory, ctx)
  return NextResponse.json({ ok: true, prefs })
}
