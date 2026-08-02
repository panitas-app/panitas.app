// Interfaces de memoria a largo plazo.
// FASE 1C solo define los contratos: todavía NO se conecta base vectorial ni persistencia.

export type LongTermMemoryKind = "preference" | "fact" | "business-setting" | "history"

export type LongTermMemoryRecord = {
  key: string
  kind: LongTermMemoryKind
  value: unknown
  storeId: string
  updatedAt: string
}

export interface LongTermMemoryStore {
  get(key: string): Promise<LongTermMemoryRecord | null>
  set(record: LongTermMemoryRecord): Promise<void>
  delete(key: string): Promise<void>
  listByStore(storeId: string): Promise<LongTermMemoryRecord[]>
}

export interface LongTermMemory {
  remember(storeId: string, key: string, value: unknown, kind?: LongTermMemoryKind): Promise<void>
  recall(storeId: string, key: string): Promise<unknown>
  forget(storeId: string, key: string): Promise<void>
  list(storeId: string): Promise<LongTermMemoryRecord[]>
}

export function createLongTermMemory(store: LongTermMemoryStore): LongTermMemory {
  return {
    async remember(storeId, key, value, kind = "fact") {
      await store.set({ key, kind, value, storeId, updatedAt: new Date().toISOString() })
    },
    async recall(storeId, key) {
      const record = await store.get(key)
      return record && record.storeId === storeId ? record.value : null
    },
    async forget(storeId, key) {
      const record = await store.get(key)
      if (record && record.storeId === storeId) await store.delete(key)
    },
    async list(storeId) {
      return store.listByStore(storeId)
    },
  }
}
