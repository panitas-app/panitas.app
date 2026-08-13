export type CollectionCategory =
  | "primer_recordatorio"
  | "segundo_recordatorio"
  | "ultimo_aviso"
  | "despues_abono"
  | "agradecimiento"

export type CollectionLevel = 1 | 2 | 3

export function suggestLevel(daysLate: number): CollectionLevel {
  if (daysLate >= 11) return 3
  if (daysLate >= 3) return 2
  return 1
}

export function suggestCategory(daysLate: number, attempts: number): CollectionCategory {
  if (attempts >= 2) return "ultimo_aviso"
  if (daysLate >= 11) return "ultimo_aviso"
  if (daysLate >= 3) return "segundo_recordatorio"
  return "primer_recordatorio"
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "")
  if (digits.length === 0) return ""
  if (digits.startsWith("58")) return digits
  return `58${digits}`
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}
