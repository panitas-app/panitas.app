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
import { CalendarIcon, ChevronLeft, ChevronRight, Check, X, Clock, RotateCcw, User } from "lucide-react"

interface Employee {
  id: string
  name: string
  photo: string | null
}

interface Service {
  id: string
  name: string
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
  createdAt: string
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
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
    } catch {} finally { setLoading(false) }
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
    } catch {}
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
            <PopoverTrigger render={<button className="flex items-center gap-1.5 text-sm font-semibold min-w-[160px] justify-center hover:text-primary transition-colors" />}>
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
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="text-center min-w-[48px]">
                    <p className="text-lg font-bold text-[#102A43]">{appt.time}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{appt.customerName}</p>
                    <p className="text-xs text-muted-foreground">{appt.customerPhone}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {appt.service && (
                        <span className="text-xs text-muted-foreground/70">{appt.service.name}</span>
                      )}
                      {appt.employee && (
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                          <User className="size-3" />
                          {appt.employee.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${statusColors[appt.status] || ""}`}>
                    {statusLabels[appt.status] || appt.status}
                  </Badge>
                  {appt.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => changeStatus(appt.id, "confirmed")} title="Confirmar">
                        <Check className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => changeStatus(appt.id, "cancelled")} title="Cancelar">
                        <X className="size-3.5" />
                      </Button>
                    </>
                  )}
                  {appt.status === "confirmed" && (
                    <Button variant="ghost" size="icon" className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => changeStatus(appt.id, "completed")} title="Completar">
                      <Check className="size-3.5" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
