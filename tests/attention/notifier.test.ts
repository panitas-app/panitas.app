/**
 * Tests de preferencias y notificador (FASE 8C).
 *
 * Cubren el filtrado por prioridad mínima, el horario de silencio (incluido el
 * cruce de medianoche) y la arquitectura de canales externos (noop en v1).
 */
import { describe, expect, it, vi } from "vitest"
import { AttentionPreferencesService } from "@/lib/attention/preferences"
import {
  FilteredAttentionNotifier,
  NoopExternalAttentionChannel,
  isWithinQuietHours,
  type ExternalAttentionChannel,
  type AttentionNotification,
} from "@/lib/attention/notifier"
import { makeFakeDb } from "./helpers"

describe("AttentionPreferencesService (FASE 8C)", () => {
  it("devuelve los defaults si no hay settings guardados", async () => {
    const db = makeFakeDb()
    const prefs = new AttentionPreferencesService(db as never)
    const result = await prefs.get("store-1")
    expect(result.minPriority).toBe("low")
    expect(result.enabledTypes.length).toBeGreaterThan(0)
    expect(result.quietHoursStart).toBe("22:00")
    expect(result.quietHoursEnd).toBe("08:00")
  })

  it("persiste y re-lee un cambio de preferencias", async () => {
    const db = makeFakeDb()
    const prefs = new AttentionPreferencesService(db as never)
    await prefs.update("store-1", { minPriority: "high", quietHoursStart: null })
    const result = await prefs.get("store-1")
    expect(result.minPriority).toBe("high")
    expect(result.quietHoursStart).toBeNull()
  })

  it("filtra tipos inválidos al actualizar", async () => {
    const db = makeFakeDb()
    const prefs = new AttentionPreferencesService(db as never)
    await prefs.update("store-1", { enabledTypes: ["credit.overdue", "nonsense.type", ""] as never })
    const result = await prefs.get("store-1")
    expect(result.enabledTypes).toEqual(["credit.overdue"])
  })
})

describe("isWithinQuietHours (FASE 8C)", () => {
  const prefs = { quietHoursStart: "22:00", quietHoursEnd: "08:00" }

  it("detecta dentro de la ventana que cruza medianoche", () => {
    expect(isWithinQuietHours(prefs, new Date("2026-08-10T23:30:00"))).toBe(true)
    expect(isWithinQuietHours(prefs, new Date("2026-08-10T03:00:00"))).toBe(true)
  })

  it("detecta fuera de la ventana", () => {
    expect(isWithinQuietHours(prefs, new Date("2026-08-10T12:00:00"))).toBe(false)
    expect(isWithinQuietHours(prefs, new Date("2026-08-10T08:30:00"))).toBe(false)
    expect(isWithinQuietHours(prefs, new Date("2026-08-10T21:59:00"))).toBe(false)
  })

  it("ventana del mismo día (sin cruce de medianoche)", () => {
    const day = { quietHoursStart: "09:00", quietHoursEnd: "17:00" }
    expect(isWithinQuietHours(day, new Date("2026-08-10T12:00:00"))).toBe(true)
    expect(isWithinQuietHours(day, new Date("2026-08-10T08:00:00"))).toBe(false)
  })

  it("sin horario configurado no aplica silencio", () => {
    expect(isWithinQuietHours({ quietHoursStart: null, quietHoursEnd: null }, new Date())).toBe(false)
  })
})

describe("FilteredAttentionNotifier (FASE 8C)", () => {
  const notification: AttentionNotification = {
    storeId: "store-1",
    itemId: "item-1",
    type: "inventory.out_of_stock",
    priority: "high",
    title: "Producto agotado",
    description: "desc",
  }

  it("envía solo notificaciones con prioridad >= mínima", async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const channel: ExternalAttentionChannel = { name: "email", send }
    const notifier = new FilteredAttentionNotifier([channel], { minPriority: "high" })

    await notifier.notify(notification) // high >= high → envía
    await notifier.notify({ ...notification, priority: "medium" }) // medium < high → no
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("no envía durante el horario de silencio", async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const channel: ExternalAttentionChannel = { name: "email", send }
    const notifier = new FilteredAttentionNotifier([channel], { minPriority: "low" })

    const result = await notifier.notify(notification, { quietHours: true })
    expect(result).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })

  it("noop: sin canales conectados no envía nada (v1)", async () => {
    const channel = new NoopExternalAttentionChannel()
    const send = vi.spyOn(channel, "send")
    const notifier = new FilteredAttentionNotifier([channel], { minPriority: "low" })
    const result = await notifier.notify(notification)
    expect(send).toHaveBeenCalledTimes(1)
    expect(result).toBe(true)
  })

  it("un canal que falla no rompe el envío del siguiente", async () => {
    const failing: ExternalAttentionChannel = {
      name: "email",
      send: vi.fn().mockRejectedValue(new Error("SMTP down")),
    }
    const ok: ExternalAttentionChannel = { name: "push", send: vi.fn().mockResolvedValue(undefined) }
    const notifier = new FilteredAttentionNotifier([failing, ok], { minPriority: "low" })
    const result = await notifier.notify(notification)
    expect(result).toBe(true)
    expect(ok.send).toHaveBeenCalledTimes(1)
  })
})
