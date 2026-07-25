"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarIcon, ChevronLeft, ChevronRight, Check, X, Clock, RotateCcw, User, MoveRight, ArrowRight, MessageCircle } from "lucide-react"

interface Employee {
  id: string
  name: string
  photo: string | null
}

interface Service {
  id: string
  name: string
  durationMin: number
}

interface Appointment {
  id: string
  customerName: string
  customerPhone: string
  date: string
  time: string
  status: string
  appointmentType: string
  address: string | null
  notes: string | null
  service: Service | null
  employee: Employee | null
  serviceId: string | null
  employeeId: string | null
  createdAt: string
}

interface SlotData {
  time: string
  available: boolean
}

interface ScheduleData {
  startTime: string
  endTime: string
}

interface BlockedSlotData {
  startTime: string
  endTime: string
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500 text-white border-amber-600",
  confirmed: "bg-blue-500 text-white border-blue-600",
  completed: "bg-emerald-500 text-white border-emerald-600",
  cancelled: "bg-red-400 text-white border-red-500",
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [statusFilter, setStatusFilter] = useState("")
  const [employeeFilter, setEmployeeFilter] = useState("")
  const [serviceFilter, setServiceFilter] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0 })
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<string>("")
  const [rescheduleTime, setRescheduleTime] = useState<string>("")
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotData[]>([])
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    fetch("/api/employees").then((r) => r.ok && r.json()).then((data) => {
      if (Array.isArray(data)) setEmployees(data)
    }).catch(() => {})
    fetch("/api/services").then((r) => r.ok && r.json()).then((data) => {
      if (Array.isArray(data)) setServices(data)
    }).catch(() => {})
  }, [])

  const fetchAgenda = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (date) params.set("date", date)
      if (statusFilter) params.set("status", statusFilter)
      if (employeeFilter) params.set("employeeId", employeeFilter)
      if (serviceFilter) params.set("serviceId", serviceFilter)
      const res = await fetch(`/api/appointments?${params}`)
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data) ? data : data.appointments || []
        setAppointments(arr)
        setStats({
          total: arr.length,
          confirmed: arr.filter((a: Appointment) => a.status === "confirmed").length,
          completed: arr.filter((a: Appointment) => a.status === "completed").length,
          cancelled: arr.filter((a: Appointment) => a.status === "cancelled").length,
        })
      }
    } catch (e) { console.error("[unhandled error]", e) } finally { setLoading(false) }
  }, [date, statusFilter, employeeFilter, serviceFilter])

  useEffect(() => { fetchAgenda() }, [fetchAgenda])

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchAgenda()
    } catch (e) { console.error("[unhandled error]", e) }
  }

  const openReschedule = (appt: Appointment) => {
    setRescheduleId(appt.id)
    setRescheduleAppointment(appt)
    setRescheduleDate(appt.date.split("T")[0])
    setRescheduleTime(appt.time)
    setRescheduleError(null)
    setRescheduleSlots([])
  }

  const fetchRescheduleSlots = useCallback(async (dateStr: string, appointment: Appointment) => {
    if (!dateStr || !appointment) return
    setRescheduleSlotsLoading(true)
    setRescheduleSlots([])
    try {
      const params = new URLSearchParams({ date: dateStr })
      if (appointment.employeeId) params.set("employeeId", appointment.employeeId)
      const res = await fetch(`/api/appointments/slots?${params}`)
      if (res.ok) {
        const data = await res.json()
        const schedules: ScheduleData[] = data.schedules || []
        const takenAppointments: { time: string; serviceId?: string }[] = data.appointments || []
        const blockedSlots: BlockedSlotData[] = data.blockedSlots || []
        const servicesList: { id: string; durationMin: number }[] = data.services || []
        const serviceDurationMap = new Map(servicesList.map(s => [s.id, s.durationMin]))

        const duration = appointment.serviceId ? (serviceDurationMap.get(appointment.serviceId) || 30) : 30
        const takenTimes = new Set(takenAppointments.map(a => a.time))

        const slots: SlotData[] = []
        for (const schedule of schedules) {
          const startParts = schedule.startTime.split(":").map(Number)
          const endParts = schedule.endTime.split(":").map(Number)
          let startMin = startParts[0] * 60 + startParts[1]
          const endMin = endParts[0] * 60 + endParts[1]
          while (startMin + duration <= endMin) {
            const h = Math.floor(startMin / 60).toString().padStart(2, "0")
            const m = (startMin % 60).toString().padStart(2, "0")
            const timeStr = `${h}:${m}`
            const isTaken = takenTimes.has(timeStr)
            const isBlocked = blockedSlots.some(b => {
              const bStart = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1])
              const bEnd = parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1])
              return startMin >= bStart && startMin < bEnd
            })
            slots.push({ time: timeStr, available: !isTaken && !isBlocked })
            startMin += duration
          }
        }
        setRescheduleSlots(slots)
      }
    } catch (e) { console.error("[unhandled error]", e) }
    finally { setRescheduleSlotsLoading(false) }
  }, [])

  useEffect(() => {
    if (rescheduleId && rescheduleDate && rescheduleAppointment) {
      fetchRescheduleSlots(rescheduleDate, rescheduleAppointment)
    }
  }, [rescheduleDate, rescheduleId, rescheduleAppointment, fetchRescheduleSlots])

  const handleReschedule = async () => {
    if (!rescheduleId || !rescheduleDate || !rescheduleTime) return
    setRescheduling(true)
    setRescheduleError(null)
    try {
      const res = await fetch(`/api/appointments/${rescheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: rescheduleDate, time: rescheduleTime }),
      })
      if (res.ok) {
        setRescheduleId(null)
        fetchAgenda()
      } else {
        const data = await res.json()
        setRescheduleError(data.error || "Error al reagendar")
      }
    } catch (e) {
      console.error("[unhandled error]", e)
      setRescheduleError("Error de conexión")
    } finally { setRescheduling(false) }
  }

  const changeDate = (delta: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split("T")[0])
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-[#102A43]">Agenda</h1>
        <div className="flex items-center gap-2">
          <Select value={employeeFilter} onValueChange={(v) => setEmployeeFilter(v || "")}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Todos los empleados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los empleados</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v || "")}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Todos servicios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los servicios</SelectItem>
              {services.map((svc) => (
                <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setDate(today)} className="text-xs gap-1.5">
            <RotateCcw className="size-3.5" /> Hoy
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
          { label: "Confirmadas", value: stats.confirmed, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Completadas", value: stats.completed, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
          { label: "Canceladas", value: stats.cancelled, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color.split(" ")[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => changeDate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Popover>
            <PopoverTrigger render={<button className="flex items-center gap-1.5 text-sm font-semibold min-w-[120px] justify-center hover:text-primary transition-colors" />}>
              <CalendarIcon className="size-4 text-muted-foreground" />
              {new Date(date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={new Date(date + "T12:00:00")}
                onSelect={(d) => d && setDate(d.toISOString().split("T")[0])}
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="size-7" onClick={() => changeDate(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex gap-1.5">
          {["", "pending", "confirmed", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s ? "bg-[#102A43] text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s ? statusLabels[s] : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Clock className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <CalendarIcon className="size-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold">No hay citas para esta fecha</p>
          <p className="text-xs">Selecciona otra fecha o cambia los filtros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {appointments.map((appt, i) => (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between rounded-xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center justify-center rounded-lg bg-[#102A43] px-3 py-2 min-w-[64px]">
                    <p className="text-lg font-bold text-white leading-tight">{appt.time}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#102A43] truncate">{appt.customerName}</p>
                    <p className="text-xs text-gray-500">{appt.customerPhone}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {appt.service && (
                        <span className="text-xs text-gray-600 font-medium">{appt.service.name}</span>
                      )}
                      {appt.employee && (
                        <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          <User className="size-3" />
                          {appt.employee.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {appt.status !== "cancelled" && appt.status !== "completed" && (
                    <Button variant="ghost" size="icon" className="size-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => openReschedule(appt)} title="Reagendar">
                      <MoveRight className="size-4" />
                    </Button>
                  )}
                  <a
                    href={`https://wa.me/${appt.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hola " + appt.customerName + ", tu cita ha sido confirmada. ¡Te esperamos!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon" className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="WhatsApp">
                      <MessageCircle className="size-4" />
                    </Button>
                  </a>
                  <Badge variant="outline" className={`text-[10px] font-bold border ${statusColors[appt.status] || ""}`}>
                    {statusLabels[appt.status] || appt.status}
                  </Badge>
                  {appt.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => changeStatus(appt.id, "confirmed")} title="Confirmar">
                        <Check className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => changeStatus(appt.id, "cancelled")} title="Cancelar">
                        <X className="size-4" />
                      </Button>
                    </>
                  )}
                  {appt.status === "confirmed" && (
                    <Button variant="ghost" size="icon" className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => changeStatus(appt.id, "completed")} title="Completar">
                      <Check className="size-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── RESCHEDULE DIALOG ─── */}
      <Dialog open={!!rescheduleId} onOpenChange={(o) => { if (!o) setRescheduleId(null) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="size-5 text-amber-600" />
              Reagendar cita
            </DialogTitle>
            <DialogDescription>
              {rescheduleAppointment && (
                <span className="text-muted-foreground">
                  {rescheduleAppointment.customerName} — {rescheduleAppointment.service?.name || "Sin servicio"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Current appointment info */}
            {rescheduleAppointment && (
              <div className="rounded-xl bg-muted/50 p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Horario actual</p>
                  <p className="font-semibold">
                    {new Date(rescheduleAppointment.date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    {" a las "}
                    {rescheduleAppointment.time}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Nuevo horario</p>
                  <p className="font-semibold text-amber-600">
                    {rescheduleDate ? (
                      <>
                        {new Date(rescheduleDate + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        {rescheduleTime ? ` a las ${rescheduleTime}` : ""}
                      </>
                    ) : "Seleccionar"}
                  </p>
                </div>
              </div>
            )}

            {/* Date picker */}
            <div>
              <label className="text-sm font-medium mb-2 block">Nueva fecha</label>
              <Popover>
                <PopoverTrigger render={<button className="w-full flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 text-sm hover:bg-accent transition-colors" />}>
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {rescheduleDate ? new Date(rescheduleDate + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Seleccionar fecha"}
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate ? new Date(rescheduleDate + "T12:00:00") : undefined}
                    onSelect={(d) => d && setRescheduleDate(d.toISOString().split("T")[0])}
                    disabled={(d) => d < new Date(new Date().toDateString())}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time slots */}
            <div>
              <label className="text-sm font-medium mb-2 block">Horarios disponibles</label>
              {rescheduleSlotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : rescheduleSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {rescheduleDate ? "No hay horarios disponibles para esta fecha" : "Selecciona una fecha para ver horarios"}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                  {rescheduleSlots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => slot.available && setRescheduleTime(slot.time)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                        !slot.available
                          ? "bg-muted text-muted-foreground/40 cursor-not-allowed line-through"
                          : rescheduleTime === slot.time
                          ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-300"
                          : "bg-card border border-border hover:border-amber-300 hover:bg-amber-50 text-foreground"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {rescheduleError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {rescheduleError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleId(null)}>Cancelar</Button>
            <Button
              onClick={handleReschedule}
              disabled={rescheduling || !rescheduleDate || !rescheduleTime || rescheduleSlotsLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {rescheduling ? "Reagendando..." : "Confirmar reagendo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
