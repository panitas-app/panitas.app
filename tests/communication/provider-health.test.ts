import { describe, expect, it } from "vitest"
import { MockCommunicationProvider, ProviderHealthMonitor } from "@/lib/communication"

describe("ProviderHealthMonitor (FASE 7C)", () => {
  it("refresca la salud de un proveedor conectado", async () => {
    const monitor = new ProviderHealthMonitor()
    const provider = new MockCommunicationProvider({ channel: "whatsapp", latencyMs: 2 })
    await provider.connect({ apiKey: "k" })
    const health = await monitor.refresh(provider)
    expect(health.connected).toBe(true)
    expect(health.status).toBe("connected")
    expect(health.latencyMs).toBe(2)
    expect(monitor.isConnected("mock-whatsapp")).toBe(true)
  })

  it("registra desconexión y degradación", async () => {
    const monitor = new ProviderHealthMonitor()
    const provider = new MockCommunicationProvider({ channel: "instagram" })
    await monitor.refresh(provider)
    expect(monitor.get("mock-instagram")).toMatchObject({ connected: false, status: "disconnected" })
    expect(monitor.isConnected("mock-instagram")).toBe(false)
    expect(monitor.summary()).toEqual({ connected: 0, total: 1, degraded: ["mock-instagram"] })
  })

  it("agrega el resumen de salud de varios proveedores", async () => {
    const monitor = new ProviderHealthMonitor()
    const wa = new MockCommunicationProvider({ channel: "whatsapp" })
    const ig = new MockCommunicationProvider({ channel: "instagram" })
    await wa.connect()
    await monitor.refresh(wa)
    await monitor.refresh(ig)
    expect(monitor.summary()).toMatchObject({ connected: 1, total: 2, degraded: ["mock-instagram"] })
    expect(monitor.list()).toHaveLength(2)
  })

  it("clear reinicia el estado", async () => {
    const monitor = new ProviderHealthMonitor()
    await monitor.refresh(new MockCommunicationProvider({ channel: "email" }))
    monitor.clear()
    expect(monitor.list()).toHaveLength(0)
  })
})
