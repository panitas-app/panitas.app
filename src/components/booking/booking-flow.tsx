"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/ui/stepper"
import { toast } from "sonner"
import {
  ChevronLeft, ChevronRight, Check, Clock, ArrowLeft, Loader2,
  Store, MapPin, Phone, ImageIcon, X, Upload, Banknote,
  Sparkles, AlertCircle,
} from "lucide-react"

export interface ServiceData {
  id: string
  name: string
  description: string | null
  image: string | null
  price: number
  durationMin: number
}

export interface SlotData {
  time: string
  available: boolean
}

export interface PaymentAccountData {
  id: string
  type: string
  bankName: string
  accountType: string
  accountNumber: string
  accountHolder: string
  documentId: string
  phone: string | null
  email: string | null
}

export interface BookingStoreData {
  id: string
  name: string
  slug: string
  logo: string | null
  banner: string | null
  description: string | null
  primaryColor: string
  whatsapp: string | null
  phone: string | null
  address: string | null
  storeHours: string | null
}

export interface BookingFlowProps {
  store: BookingStoreData
  services: ServiceData[]
  paymentAccounts?: PaymentAccountData[]
  slug: string
  employeeId?: string
  onComplete?: () => void
  showHeader?: boolean
}

const pad = (n: number) => n.toString().padStart(2, "0")

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

const today = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const formatDateLabel = (d: Date) => `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
const formatHora12 = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${period}`
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

function durationLabel(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m > 0 ? `${h}h ${m}min` : `${h} hora`
  }
  return `${min} min`
}

type Step = "service" | "date" | "time" | "info" | "payment"

const STEP_LABELS = [
  { label: "Servicio" },
  { label: "Fecha" },
  { label: "Hora" },
  { label: "Datos" },
  { label: "Pago" },
]

export function BookingFlow({ store, services, paymentAccounts = [], slug, employeeId, onComplete, showHeader = true }: BookingFlowProps) {
  const router = useRouter()
  const accentColor = store.primaryColor || "#FFB92E"

  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotData[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(today())

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [receiptImage, setReceiptImage] = useState("")
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const receiptInputRef = useRef<HTMLInputElement>(null)

  const totalAmount = selectedService?.price || 0

  const stepIndex = useMemo(() => {
    const order: Step[] = ["service", "date", "time", "info", "payment"]
    return order.indexOf(step)
  }, [step])

  useEffect(() => {
    if (!selectedDate || !selectedService) return
    setSlotsLoading(true)
    setSelectedTime(null)
    const dateStr = toDateStr(selectedDate)
    fetch(`/api/appointments/slots?store=${slug}&date=${dateStr}${employeeId ? `&employeeId=${employeeId}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data.schedules || []
        const appointments = data.appointments || []
        const blocked = data.blockedSlots || []
        const takenTimes = new Set(appointments.map((a: { time: string }) => a.time))
        const blockedRanges: { start: string; end: string }[] = blocked.map((b: { startTime: string; endTime: string }) => ({
          start: b.startTime,
          end: b.endTime,
        }))
        const generated: SlotData[] = []
        for (const sched of raw) {
          const [startH, startM] = sched.startTime.split(":").map(Number)
          const [endH, endM] = sched.endTime.split(":").map(Number)
          const startMinutes = startH * 60 + startM
          const endMinutes = endH * 60 + endM
          const duration = selectedService.durationMin
          for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
            const hh = Math.floor(m / 60)
            const mm = m % 60
            const time = `${pad(hh)}:${pad(mm)}`
            const available = !takenTimes.has(time) && !blockedRanges.some(
              (br: { start: string; end: string }) => time >= br.start && time < br.end
            )
            generated.push({ time, available })
          }
        }
        setSlots(generated)
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, selectedService, slug])

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [calendarMonth])

  const changeMonth = (delta: number) => {
    setCalendarMonth((prev) => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + delta)
      return d
    })
  }

  const canSelectDate = (day: number) => {
    if (!day) return false
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
    return d >= today()
  }

  const isSelectedDate = (day: number) => {
    if (!selectedDate || !day) return false
    return selectedDate.getDate() === day &&
      selectedDate.getMonth() === calendarMonth.getMonth() &&
      selectedDate.getFullYear() === calendarMonth.getFullYear()
  }

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingReceipt(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReceiptImage(data.url)
      toast.success("Comprobante subido")
    } catch {
      toast.error("Error al subir el comprobante")
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Completa tu nombre y teléfono")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: slug,
          serviceId: selectedService!.id,
          employeeId: employeeId || undefined,
          date: toDateStr(selectedDate!),
          time: selectedTime!,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim() || undefined,
          receiptImage: receiptImage || undefined,
        }),
      })
      if (res.ok) {
        setDone(true)
        toast.success("Cita agendada exitosamente")
      } else {
        const err = await res.json()
        toast.error(err.error || "Error al agendar la cita")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = (nextStep: Step) => setStep(nextStep)
  const goBack = (prevStep: Step) => setStep(prevStep)

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
        >
          <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Check className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Cita agendada</h2>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedService?.name} &middot; {selectedDate && formatDateLabel(selectedDate)} &middot; {selectedTime && formatHora12(selectedTime)}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            {store.name} se pondrá en contacto contigo para confirmar.
          </p>
          <div className="flex flex-col gap-2">
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}?text=Hola%2C%20agend%C3%A9%20una%20cita%20para%20${encodeURIComponent(selectedService?.name || "")}%20el%20${encodeURIComponent(formatDateLabel(selectedDate!))}%20a%20las%20${encodeURIComponent(formatHora12(selectedTime!))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-2 rounded-xl py-5 text-sm font-bold" style={{ backgroundColor: "#25D366", color: "white" }}>
                  Contactar por WhatsApp
                </Button>
              </a>
            )}
            <Button variant="outline" className="w-full rounded-xl py-5 text-sm" onClick={() => { if (onComplete) onComplete(); else window.scrollTo({ top: 0, behavior: "smooth" }) }}>
              {onComplete ? "Cerrar" : "Volver"}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          {step !== "service" && (
            <Button variant="ghost" className="size-8 shrink-0" onClick={() => {
              const backMap: Record<Step, Step> = { service: "service", date: "service", time: "date", info: "time", payment: "info" }
              goBack(backMap[step])
            }}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="flex items-center gap-2.5">
            {store.logo ? (
              <img src={store.logo} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                <Store className="size-4 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">Agendar Cita</h1>
              <p className="text-xs text-muted-foreground">{store.name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Stepper steps={STEP_LABELS} currentStep={stepIndex + 1} />
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Service */}
        {step === "service" && (
          <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-sm font-semibold text-foreground mb-3">Selecciona un servicio</h2>
            {services.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No hay servicios disponibles</p>
                <p className="text-xs">Vuelve más tarde o contacta directamente.</p>
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5 rounded-xl text-xs">
                      <Phone className="size-3.5" /> Contactar
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); goNext("date") }}
                    className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm ${
                      selectedService?.id === svc.id ? "border-2" : "border-border"
                    }`}
                    style={selectedService?.id === svc.id ? { borderColor: accentColor } : {}}
                  >
                    <div className="flex items-start gap-4">
                      {svc.image && (
                        <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <img src={svc.image} alt={svc.name} className="size-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{svc.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {svc.price > 0 && (
                            <p className="text-base font-bold" style={{ color: accentColor }}>${svc.price.toFixed(2)}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="size-3" /> {durationLabel(svc.durationMin)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: Date */}
        {step === "date" && (
          <motion.div key="date" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" className="size-7 shrink-0" onClick={() => goBack("service")}>
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground">Selecciona una fecha</h2>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" className="size-8" onClick={() => changeMonth(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground">
                  {MESES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </span>
                <Button variant="ghost" className="size-8" onClick={() => changeMonth(1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                  <div key={i} className="aspect-square">
                    {day && canSelectDate(day) ? (
                      <button
                        onClick={() => { setSelectedDate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)); goNext("time") }}
                        className={`size-full rounded-lg text-xs font-semibold transition-all ${
                          isSelectedDate(day) ? "text-white shadow-sm" : "hover:bg-muted text-foreground"
                        }`}
                        style={isSelectedDate(day) ? { backgroundColor: accentColor } : {}}
                      >
                        {day}
                      </button>
                    ) : day ? (
                      <div className="size-full rounded-lg text-xs text-muted-foreground/20 flex items-center justify-center">
                        {day}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Time */}
        {step === "time" && (
          <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" className="size-7 shrink-0" onClick={() => goBack("date")}>
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Selecciona un horario</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedDate && formatDateLabel(selectedDate)} &middot; {selectedService?.name}
                </p>
              </div>
            </div>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-xl border border-border bg-card">
                <Clock className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No hay horarios disponibles</p>
                <p className="text-xs text-center max-w-xs">Prueba con otra fecha o vuelve más tarde.</p>
                <Button variant="outline" size="sm" className="mt-1 rounded-xl" onClick={() => goBack("date")}>
                  Elegir otra fecha
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => { setSelectedTime(slot.time); goNext("info") }}
                    className={`rounded-xl border py-3 text-center text-sm font-semibold transition-all ${
                      !slot.available
                        ? "border-border/50 text-muted-foreground/30 bg-muted/30 cursor-not-allowed line-through"
                        : selectedTime === slot.time
                          ? "text-white shadow-sm"
                          : "border-border hover:border-primary/30 text-foreground bg-card"
                    }`}
                    style={selectedTime === slot.time && slot.available ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
                  >
                    {formatHora12(slot.time)}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 4: Info */}
        {step === "info" && (
          <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" className="size-7 shrink-0" onClick={() => goBack("time")}>
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground">Tus datos</h2>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 mb-4 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Servicio:</span> {selectedService?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Fecha:</span> {selectedDate && formatDateLabel(selectedDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Hora:</span> {selectedTime && formatHora12(selectedTime)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Nombre completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Teléfono *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0412-1234567"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Notas <span className="text-muted-foreground/60">(opcional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguna información adicional..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <Button
              onClick={() => goNext(totalAmount > 0 && paymentAccounts.length > 0 ? "payment" : "payment")}
              className="w-full mt-4 rounded-xl py-5 text-sm font-bold"
              style={{ backgroundColor: accentColor, color: "#102A43" }}
            >
              Continuar
            </Button>
          </motion.div>
        )}

        {/* STEP 5: Payment & confirm */}
        {step === "payment" && (
          <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" className="size-7 shrink-0" onClick={() => goBack("info")}>
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground">Pago y confirmación</h2>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Resumen</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-semibold text-foreground">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-semibold text-foreground">{selectedDate && formatDateLabel(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hora</span>
                <span className="font-semibold text-foreground">{selectedTime && formatHora12(selectedTime)}</span>
              </div>
              {totalAmount > 0 && (
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg" style={{ color: accentColor }}>${totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment accounts */}
            {totalAmount > 0 && paymentAccounts.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 mb-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Banknote className="size-3.5" /> Datos de pago
                </p>
                <div className="space-y-2">
                  {paymentAccounts.map((acc) => (
                    <div key={acc.id} className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                      <p className="font-semibold text-foreground">{acc.bankName} &middot; {acc.accountType === "corriente" ? "Corriente" : "Ahorro"}</p>
                      <p className="text-muted-foreground font-mono tracking-wider">{acc.accountNumber}</p>
                      <p className="text-muted-foreground">{acc.accountHolder}</p>
                      {acc.documentId && <p className="text-muted-foreground">CI: {acc.documentId}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receipt upload */}
            {totalAmount > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 mb-4">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Upload className="size-3.5" /> Comprobante de pago
                </p>
                {receiptImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-border group">
                    <img src={receiptImage} alt="Comprobante" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setReceiptImage("")}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="w-full rounded-lg border-2 border-dashed border-border p-4 text-center transition-all hover:border-muted-foreground/30 hover:bg-muted/20 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingReceipt ? (
                      <Loader2 className="size-6 mx-auto animate-spin text-muted-foreground" />
                    ) : (
                      <ImageIcon className="size-6 mx-auto text-muted-foreground/50" />
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      {uploadingReceipt ? "Subiendo..." : "Subir comprobante"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">JPG, PNG · Máximo 10MB</p>
                    <input ref={receiptInputRef} type="file" accept="image/*" onChange={handleReceiptUpload} hidden />
                  </button>
                )}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl py-5 text-sm font-bold"
              style={{ backgroundColor: accentColor, color: "#102A43" }}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              {submitting ? "Agendando..." : totalAmount > 0 ? "Confirmar y pagar después" : "Confirmar cita"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
