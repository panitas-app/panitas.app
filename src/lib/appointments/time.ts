import type { BookingFlowType, SlotConfig } from "./types"

export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const
export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] as const

export const pad = (n: number) => n.toString().padStart(2, "0")

export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const minutesToTime = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`

export const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export const formatHora12 = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${period}`
}

export const formatFechaLarga = (date: Date) => `${DIAS_SEMANA[date.getDay()]}, ${date.getDate()} de ${MESES[date.getMonth()]}`

export const generateIntervalSlots = (inicio: string, fin: string, intervalo: number): string[] => {
  const start = timeToMinutes(inicio)
  const end = timeToMinutes(fin)
  const slots: string[] = []
  for (let t = start; t + intervalo <= end; t += intervalo) slots.push(minutesToTime(t))
  return slots
}

export const generateBlockSlots = (inicio: string, fin: string, minDuration: number): string[] => {
  const start = timeToMinutes(inicio)
  const end = timeToMinutes(fin)
  if (end - start < minDuration) return []
  return [minutesToTime(start)]
}

export const generateHomeServiceSlots = (inicio: string, fin: string, intervalo: number): string[] => {
  const start = timeToMinutes(inicio)
  const end = timeToMinutes(fin)
  const slots: string[] = []
  const adjustedInterval = Math.max(intervalo, 60)
  for (let t = start; t + adjustedInterval <= end; t += adjustedInterval) slots.push(minutesToTime(t))
  return slots
}

export const generateSlotsByFlow = (inicio: string, fin: string, config: SlotConfig): string[] => {
  switch (config.flowType) {
    case "interval": return generateIntervalSlots(inicio, fin, config.interval)
    case "block": return generateBlockSlots(inicio, fin, config.minDuration)
    case "home_service": return generateHomeServiceSlots(inicio, fin, config.interval)
  }
}

export const professionToSlotConfig = (profession: { booking_flow_type: BookingFlowType; default_interval: number; min_duration: number; max_duration: number; requires_deposit: boolean; supports_online: boolean }): SlotConfig => ({
  flowType: profession.booking_flow_type,
  interval: profession.default_interval,
  minDuration: profession.min_duration,
  maxDuration: profession.max_duration,
  requiresDeposit: profession.requires_deposit,
  supportsOnline: profession.supports_online,
})
