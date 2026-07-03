import { BANKS_VENEZUELA, DOCUMENT_TYPES } from "@/lib/constants"

const BANK_CODES = new Set<string>(BANKS_VENEZUELA.map((b) => b.code))

export function getBankName(code: string): string {
  return BANKS_VENEZUELA.find((b) => b.code === code)?.name || code
}

export function formatAccountNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 20) return raw
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
}

export function validateAccountNumber(raw: string): { valid: boolean; error?: string } {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 20) return { valid: false, error: "Debe tener exactamente 20 dígitos" }
  const bankCode = digits.slice(0, 4)
  if (!BANK_CODES.has(bankCode)) return { valid: false, error: "Código de banco inválido (primeros 4 dígitos)" }
  return { valid: true }
}

export function validatePhone(raw: string): { valid: boolean; error?: string; clean?: string } {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 11) return { valid: false, error: "Debe tener 11 dígitos (ej: 04121234567)" }
  if (!digits.startsWith("04")) return { valid: false, error: "Debe comenzar con 04" }
  return { valid: true, clean: digits }
}

const DOC_TYPES = DOCUMENT_TYPES.map((d) => d.value) as string[]

export function validateDocumentId(raw: string): { valid: boolean; error?: string; clean?: string } {
  const s = raw.trim().toUpperCase()
  if (s.length < 2) return { valid: false, error: "Incluye tipo de documento (V, E, J, P, G)" }
  const prefix = s[0]
  if (!DOC_TYPES.includes(prefix)) return { valid: false, error: `Tipo de documento inválido. Use: ${DOC_TYPES.join(", ")}` }
  const numPart = s.slice(1).replace(/\D/g, "")
  if (numPart.length < 5) return { valid: false, error: "Número de documento muy corto" }
  return { valid: true, clean: `${prefix}${numPart}` }
}

export function validateReference(raw: string): { valid: boolean; error?: string } {
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 6) return { valid: false, error: "La referencia debe tener al menos 6 dígitos" }
  if (digits.length > 20) return { valid: false, error: "La referencia no puede exceder 20 dígitos" }
  return { valid: true }
}

export function isMobilePayment(bankCode: string | null): boolean {
  if (!bankCode) return false
  const mobileBanks = new Set<string>(["0134", "0102", "0105", "0108", "0172", "0174", "0191", "0104", "0115", "0114", "0157", "0163", "0151", "0175", "0171"])
  return mobileBanks.has(bankCode)
}
