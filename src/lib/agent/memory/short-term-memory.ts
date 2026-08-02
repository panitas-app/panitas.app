type MemoryEntry = {
  value: string
  expiresAt?: number
}

const DEFAULT_TTL_MS = 60 * 60 * 1000

export class ShortTermMemory {
  private readonly store = new Map<string, MemoryEntry>()

  set(key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  get(key: string): string | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  keys(): string[] {
    return [...this.store.keys()]
  }
}

export const agentMemory = new ShortTermMemory()
