export type BookingFlowType = "interval" | "block" | "home_service"

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed"

export type AppointmentType = "in_person" | "online" | "home_service"

export interface SlotConfig {
  flowType: BookingFlowType
  interval: number
  minDuration: number
  maxDuration: number
  requiresDeposit: boolean
  supportsOnline: boolean
}
