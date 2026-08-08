import type {
  BusinessMemoryItem,
  BusinessMemoryKind,
  BusinessMemoryObservation,
  LearningConfig,
} from "@/lib/business-memory"
import type { MemoryContext } from "@/lib/agent/memory"
import { createInMemoryBusinessMemoryStore } from "@/lib/business-memory/memory-store"
import { BusinessMemoryEngine } from "@/lib/business-memory/memory-engine"

let seq = 0

export function makeMemoryItem(overrides: Partial<BusinessMemoryItem> = {}): BusinessMemoryItem {
  seq += 1
  const now = new Date().toISOString()
  return {
    id: `bm-${seq}`,
    storeId: "store-1",
    userId: "user-1",
    negocioId: null,
    kind: "preference",
    importance: "HIGH",
    key: `bm.preference.test-${seq}`,
    label: `Recuerdo de prueba ${seq}`,
    value: { valor: seq },
    metadata: {
      source: "explicit",
      status: "confirmed",
      strength: 1,
      threshold: 1,
      tags: ["prueba"],
    },
    source: "explicit",
    status: "confirmed",
    expiresAt: null,
    accessCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function makeObservation(overrides: Partial<BusinessMemoryObservation> = {}): BusinessMemoryObservation {
  return {
    ctx,
    kind: "preference",
    key: "bm.preference.currency",
    label: "Moneda principal",
    value: { currency: "USD" },
    tags: ["moneda"],
    explicit: false,
    ...overrides,
  }
}

export const ctx: MemoryContext = { userId: "user-1", storeId: "store-1", negocioId: null }
export const otherStoreCtx: MemoryContext = { userId: "user-9", storeId: "store-2", negocioId: null }

export function createTestEngine(seed: BusinessMemoryItem[] = [], config: Partial<LearningConfig> = {}) {
  const store = createInMemoryBusinessMemoryStore()
  for (const item of seed) store.items.set(`${item.storeId}:${item.key}`, { ...item })
  return new BusinessMemoryEngine({ store, config })
}

export function makeItemOf(kind: BusinessMemoryKind, key: string, label: string, value: unknown, overrides: Partial<BusinessMemoryItem> = {}): BusinessMemoryItem {
  return makeMemoryItem({ kind, key, label, value, ...overrides })
}
