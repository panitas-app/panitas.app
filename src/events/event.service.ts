export type AppEvents = {
  "sale.created": {
    orderId: string
    storeId: string
    total: number
    orderNumber: string
  }
  "order.created": {
    orderId: string
    storeId: string
    orderNumber: string
    total: number
    paymentStatus: string
  }
  "product.created": {
    productId: string
    storeId: string
    name: string
    sku: string
  }
  "product.updated": {
    productId: string
    storeId: string
    name: string
    sku: string
  }
  "inventory.low_stock": {
    productId: string
    storeId: string
    productName: string
    remainingStock: number
  }
  "appointment.created": {
    appointmentId: string
    negocioId: string
    date: Date
    time: string
  }
  "customer.created": {
    customerId: string
    storeId: string
    name: string
  }
}

export type AppEventName = keyof AppEvents

type Listener<K extends AppEventName> = (payload: AppEvents[K]) => void | Promise<void>

export class EventService {
  private readonly listeners = new Map<AppEventName, Set<Listener<AppEventName>>>()

  on<K extends AppEventName>(event: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener<AppEventName>>()
    set.add(listener as Listener<AppEventName>)
    this.listeners.set(event, set)
    return () => {
      set.delete(listener as Listener<AppEventName>)
    }
  }

  emit<K extends AppEventName>(event: K, payload: AppEvents[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      try {
        void listener(payload)
      } catch (e) {
        console.error(`[event:${event}] listener error`, e)
      }
    }
  }

  async emitAsync<K extends AppEventName>(event: K, payload: AppEvents[K]): Promise<void> {
    const set = this.listeners.get(event)
    if (!set) return
    const results: Array<Promise<void>> = []
    for (const listener of set) {
      try {
        const res = listener(payload)
        if (res && typeof res.then === "function") results.push(res)
      } catch (e) {
        console.error(`[event:${event}] listener error`, e)
      }
    }
    await Promise.all(results)
  }

  clear(): void {
    this.listeners.clear()
  }
}

export const eventService = new EventService()
