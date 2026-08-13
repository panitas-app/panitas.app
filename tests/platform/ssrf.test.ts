import { describe, expect, it } from "vitest"
import {
  assertSafeEndpoint,
  isPrivateIpv4,
  isPrivateIpv6,
  isPrivateAddress,
  isAllowedMetaMediaUrl,
  resolveAllAddresses,
  type AddressResolver,
} from "@/lib/platform/webhooks/ssrf"

const PUBLIC: AddressResolver = async (host) => (host === "aceptado.ejemplo.com" ? ["93.184.216.34"] : [])

describe("SSRF (FASE 8D)", () => {
  it("clasifica IPv4 privadas", () => {
    expect(isPrivateIpv4("127.0.0.1")).toBe(true)
    expect(isPrivateIpv4("10.0.0.1")).toBe(true)
    expect(isPrivateIpv4("192.168.1.1")).toBe(true)
    expect(isPrivateIpv4("172.16.0.1")).toBe(true)
    expect(isPrivateIpv4("172.31.255.255")).toBe(true)
    expect(isPrivateIpv4("169.254.169.254")).toBe(true)
    expect(isPrivateIpv4("0.0.0.0")).toBe(true)
    expect(isPrivateIpv4("255.255.255.255")).toBe(true)
    expect(isPrivateIpv4("224.0.0.1")).toBe(true)
    expect(isPrivateIpv4("8.8.8.8")).toBe(false)
    expect(isPrivateIpv4("93.184.216.34")).toBe(false)
    expect(isPrivateIpv4("not-an-ip")).toBe(false)
  })

  it("clasifica IPv6 privadas y mapeadas", () => {
    expect(isPrivateIpv6("::1")).toBe(true)
    expect(isPrivateIpv6("::")).toBe(true)
    expect(isPrivateIpv6("fc00::1")).toBe(true)
    expect(isPrivateIpv6("fd12::1")).toBe(true)
    expect(isPrivateIpv6("fe80::1")).toBe(true)
    expect(isPrivateIpv6("ff02::1")).toBe(true)
    expect(isPrivateIpv6("2001:db8::1")).toBe(true)
    // IPv4 mapeada a privada → bloqueada.
    expect(isPrivateIpv6("::ffff:127.0.0.1")).toBe(true)
    expect(isPrivateIpv6("::ffff:8.8.8.8")).toBe(false)
    expect(isPrivateIpv6("2606:4700:4700::1111")).toBe(false)
  })

  it("isPrivateAddress bloquea lo desconocido", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true)
    expect(isPrivateAddress("hostname-ejemplo")).toBe(true)
    expect(isPrivateAddress("8.8.8.8")).toBe(false)
  })

  it("bloquea endpoints hacia localhost, redes privadas y metadata", async () => {
    const blocked = [
      "http://localhost:3000/hook",
      "http://127.0.0.1/hook",
      "http://10.0.0.5/hook",
      "http://192.168.0.10/hook",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/hook",
      "http://[fc00::1]/hook",
      "http://servidor.local/hook",
      "http://intranet.internal/hook",
      "http://maquina.lan/hook",
    ]
    for (const endpoint of blocked) {
      await expect(assertSafeEndpoint(endpoint)).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    }
  })

  it("bloquea protocolos no http(s) y credenciales en la URL", async () => {
    await expect(assertSafeEndpoint("ftp://8.8.8.8/hook")).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    await expect(assertSafeEndpoint("file:///etc/passwd")).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    await expect(assertSafeEndpoint("https://usuario:clave@8.8.8.8/hook")).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    await expect(assertSafeEndpoint("")).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
    await expect(assertSafeEndpoint("no-es-una-url")).rejects.toMatchObject({ code: "WEBHOOK_INVALID_ENDPOINT" })
  })

  it("acepta IPs públicas directas", async () => {
    await expect(assertSafeEndpoint("https://8.8.8.8/hook")).resolves.toContain("8.8.8.8")
  })

  it("resuelve el DNS y bloquea si CUALQUIER dirección es privada", async () => {
    const resolver: AddressResolver = async () => ["10.0.0.5", "93.184.216.34"]
    await expect(assertSafeEndpoint("https://hook.example.com/hook", resolver)).rejects.toMatchObject({
      code: "WEBHOOK_INVALID_ENDPOINT",
    })
  })

  it("acepta hostname público tras resolución", async () => {
    await expect(assertSafeEndpoint("https://aceptado.ejemplo.com/hook", PUBLIC)).resolves.toContain("aceptado.ejemplo.com")
  })

  it("bloquea si el hostname no resuelve o no tiene direcciones", async () => {
    await expect(assertSafeEndpoint("https://no-resuelve.invalid/hook", async () => [])).rejects.toMatchObject({
      code: "WEBHOOK_INVALID_ENDPOINT",
    })
    await expect(assertSafeEndpoint("https://no-resuelve.invalid/hook", async () => { throw new Error("ENOTFOUND") })).rejects.toMatchObject({
      code: "WEBHOOK_INVALID_ENDPOINT",
    })
  })

  it("resolveAllAddresses cachea durante 60s", async () => {
    let calls = 0
    const resolver: AddressResolver = async () => {
      calls++
      return ["93.184.216.34"]
    }
    await resolveAllAddresses("cache.example.com", resolver)
    await resolveAllAddresses("cache.example.com", resolver)
    expect(calls).toBe(1)
  })
})

describe("SSRF media (FASE 8E) — isAllowedMetaMediaUrl", () => {
  it("acepta hosts de media de Meta", () => {
    expect(isAllowedMetaMediaUrl("https://scontent.fccs1-1.fna.fbcdn.net/v/t39.30808-6/photo.jpg")).toBe(true)
    expect(isAllowedMetaMediaUrl("https://lookaside.fbsbx.com/whatsapp/wa/image.jpg")).toBe(true)
    expect(isAllowedMetaMediaUrl("https://graph.facebook.com/v21.0/12345")).toBe(true)
    expect(isAllowedMetaMediaUrl("https://www.instagram.com/p/ABC/media?size=l")).toBe(true)
    expect(isAllowedMetaMediaUrl("https://scontent.cdninstagram.com/v/t51.2885-15/photo.jpg")).toBe(true)
  })

  it("rechaza hosts ajenos, credenciales y protocolos no-https", () => {
    expect(isAllowedMetaMediaUrl("http://169.254.169.254/latest/meta-data/")).toBe(false)
    expect(isAllowedMetaMediaUrl("http://scontent.fbcdn.net/photo.jpg")).toBe(false)
    expect(isAllowedMetaMediaUrl("https://evil.com/photo.jpg")).toBe(false)
    expect(isAllowedMetaMediaUrl("https://fbcdn.net.evil.com/photo.jpg")).toBe(false)
    expect(isAllowedMetaMediaUrl("https://usuario:clave@scontent.fbcdn.net/photo.jpg")).toBe(false)
    expect(isAllowedMetaMediaUrl("file:///etc/passwd")).toBe(false)
    expect(isAllowedMetaMediaUrl("")).toBe(false)
    expect(isAllowedMetaMediaUrl("no-es-url")).toBe(false)
  })
})
