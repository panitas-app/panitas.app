/**
 * Platform (FASE 8D) — protección SSRF para endpoints de webhook.
 *
 * Los endpoints son URLs proporcionadas por usuarios. Nunca dejamos que Panitas
 * haga request a localhost, IPs privadas, redes internas, link-local o el
 * metadata endpoint (169.254.169.254). Validamos la URL y resolvemos el
 * hostname comprobando TODAS las direcciones antes de entregar.
 */
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { ApiError } from "@/lib/platform/errors"

export type AddressResolver = (hostname: string) => Promise<string[]>

const defaultResolver: AddressResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true })
  return records.map((r) => r.address)
}

/** IPv4 → número de 32 bits. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function inRange(ipInt: number, base: string, prefix: number): boolean {
  const baseInt = ipv4ToInt(base)
  if (baseInt === null) return false
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

const PRIVATE_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // current network (only valid as source)
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. metadata 169.254.169.254
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24],
  ["192.0.2.0", 24], // documentation (TEST-NET-1)
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmark
  ["198.51.100.0", 24], // documentation (TEST-NET-2)
  ["203.0.113.0", 24], // documentation (TEST-NET-3)
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
]

export function isPrivateIpv4(ip: string): boolean {
  const int = ipv4ToInt(ip)
  if (int === null) return false
  if (int === 0xffffffff) return true // 255.255.255.255
  return PRIVATE_RANGES.some(([base, prefix]) => inRange(int, base, prefix))
}

function isIpv4Mapped(ip: string): string | null {
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(ip)
  return m ? m[1] : null
}

export function isPrivateIpv6(ip: string): boolean {
  const mapped = isIpv4Mapped(ip)
  if (mapped) return isPrivateIpv4(mapped)
  const lower = ip.toLowerCase()
  if (lower === "::" || lower === "::1") return true // unspecified / loopback
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // fc00::/7 unique local
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true // fe80::/10 link local
  if (lower.startsWith("ff")) return true // multicast ff00::/8
  if (lower.startsWith("2001:db8")) return true // documentation
  if (lower.startsWith("fe80")) return true
  return false
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return isPrivateIpv4(address)
  if (version === 6) return isPrivateIpv6(address)
  return true // no se puede determinar → bloquear
}

const DNS_CACHE = new Map<string, { addresses: string[]; at: number }>()
const DNS_CACHE_TTL_MS = 60_000

export async function resolveAllAddresses(hostname: string, resolver: AddressResolver = defaultResolver): Promise<string[]> {
  const cached = DNS_CACHE.get(hostname)
  if (cached && Date.now() - cached.at < DNS_CACHE_TTL_MS) return cached.addresses
  const addresses = await resolver(hostname)
  DNS_CACHE.set(hostname, { addresses, at: Date.now() })
  return addresses
}

/**
 * Valida y normaliza un endpoint de webhook. Lanza ApiError con código
 * WEBHOOK_INVALID_ENDPOINT si la URL es inválida o insegura (SSRF).
 */
export async function assertSafeEndpoint(raw: string, resolver: AddressResolver = defaultResolver): Promise<string> {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint inválido", 422)
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint debe ser una URL válida (https://...)", 422)
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint debe usar http o https", 422)
  }
  if (url.username || url.password) {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint no debe incluir credenciales", 422)
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (!hostname) throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint sin host", 422)

  const hostIpVersion = isIP(hostname)
  if (hostIpVersion !== 0) {
    if (isPrivateAddress(hostname)) {
      throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "No se permiten endpoints hacia redes privadas o locales", 422)
    }
    return url.toString()
  }

  const lower = hostname.toLowerCase()
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".lan")
  ) {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "No se permiten endpoints hacia localhost o redes internas", 422)
  }

  // Resolver DNS y verificar TODAS las direcciones.
  let addresses: string[]
  try {
    addresses = await resolveAllAddresses(hostname, resolver)
  } catch {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "No se pudo resolver el endpoint", 422)
  }
  if (addresses.length === 0) {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "Endpoint sin dirección IP", 422)
  }
  if (addresses.some((addr) => isPrivateAddress(addr))) {
    throw new ApiError("WEBHOOK_INVALID_ENDPOINT", "El endpoint resuelve a una red privada o local", 422)
  }

  return url.toString()
}

/**
 * Permite únicamente hosts controlados por Meta para descargas de media
 * (adjuntos de Instagram/Messenger/WhatsApp). Previene SSRF: el fetch NO
 * debe seguir redirects (redirect:"error") ni salir a otros hosts.
 */
const META_MEDIA_HOSTS = new Set([
  "graph.facebook.com",
  "graph.instagram.com",
  "lookaside.fbsbx.com",
  "www.facebook.com",
  "m.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "cdninstagram.com",
  "scontent.cdninstagram.com",
])

const META_MEDIA_SUFFIXES = [".fbcdn.net", ".facebook.com", ".instagram.com", ".cdninstagram.com"]

export function isAllowedMetaMediaUrl(raw: string): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return false
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== "https:") return false
  if (url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  if (META_MEDIA_HOSTS.has(host)) return true
  return META_MEDIA_SUFFIXES.some((s) => host.endsWith(s))
}

export const MEDIA_FETCH_TIMEOUT_MS = 10_000
