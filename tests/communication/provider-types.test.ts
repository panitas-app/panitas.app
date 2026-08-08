import { describe, expect, it } from "vitest"
import {
  COMMUNICATION_EVENT_DOMAIN,
  COMMUNICATION_EVENTS,
  PROVIDER_CHANNEL_META,
  PROVIDER_CHANNEL_TYPES,
} from "@/lib/communication"

describe("provider-types (FASE 7C)", () => {
  it("define cinco canales con su proveedor mock por defecto", () => {
    expect(PROVIDER_CHANNEL_TYPES).toHaveLength(5)
    for (const channel of PROVIDER_CHANNEL_TYPES) {
      expect(PROVIDER_CHANNEL_META[channel]).toMatchObject({ name: expect.any(String) })
      expect(PROVIDER_CHANNEL_META[channel].defaultProviderId).toBe(`mock-${channel}`)
    }
  })

  it("define los seis eventos del dominio communication", () => {
    expect(COMMUNICATION_EVENTS).toEqual([
      "channel.connected",
      "channel.disconnected",
      "message.received",
      "message.sent",
      "provider.error",
      "provider.retry",
    ])
    expect(COMMUNICATION_EVENT_DOMAIN).toBe("communication")
  })
})
