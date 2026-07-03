"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { BookingFlow, type ServiceData, type BookingStoreData, type PaymentAccountData } from "@/components/booking/booking-flow"
import { Loader2, Store, MapPin, Phone, Briefcase, Clock } from "lucide-react"

interface EmployeeData {
  id: string
  name: string
  photo: string | null
  position: string | null
  phone: string | null
  email: string | null
}

interface ScheduleData {
  id: string
  employeeId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

interface EmployeeProfileData {
  employee: EmployeeData
  schedules: ScheduleData[]
  services: ServiceData[]
  store: BookingStoreData
  paymentAccounts: PaymentAccountData[]
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const employeeSlug = params?.employeeSlug as string

  const [data, setData] = useState<EmployeeProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/store/${slug}/employee/${employeeSlug}`)
        if (!res.ok) {
          if (res.status === 404) setError("Empleado no encontrado")
          else throw new Error()
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError("Error al cargar el perfil")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, employeeSlug])

  const accentColor = data?.store.primaryColor || "#FFB92E"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <Store className="size-12 text-muted-foreground/30" />
        <h1 className="text-xl font-bold text-foreground">{error || "Perfil no disponible"}</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          El perfil que buscas no existe o ha sido desactivado.
        </p>
      </div>
    )
  }

  const { employee, schedules, services, store } = data
  const activeSchedules = schedules.filter((s) => s.isActive).sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Employee header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden mb-6 bg-card border border-border"
        >
          <div className="bg-gradient-to-r from-[var(--accent,#102A43)] to-[var(--accent,#102A43)]/80 p-6">
            <div className="flex items-center gap-5">
              <div className="size-20 rounded-full bg-background/20 overflow-hidden ring-2 ring-white/30 shrink-0">
                {employee.photo ? (
                  <img src={employee.photo} alt={employee.name} className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <Store className="size-8 text-white/60" />
                  </div>
                )}
              </div>
              <div className="text-white min-w-0">
                <h1 className="text-xl font-bold">{employee.name}</h1>
                {employee.position && (
                  <p className="text-sm text-white/80 mt-0.5 flex items-center gap-1.5">
                    <Briefcase className="size-3.5" />
                    {employee.position}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/70">
                  {store.name && (
                    <span className="flex items-center gap-1">
                      <Store className="size-3" />
                      {store.name}
                    </span>
                  )}
                  {employee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {employee.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedules */}
          {activeSchedules.length > 0 && (
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="size-3" />
                Horarios
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {activeSchedules.map((s) => (
                  <div key={s.id} className="text-xs text-muted-foreground flex justify-between">
                    <span className="font-medium text-foreground/80">{DIAS[s.dayOfWeek]}</span>
                    <span>{s.startTime} - {s.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services summary */}
          {services.length > 0 && (
            <div className="px-6 py-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Servicios
              </h3>
              <div className="space-y-1.5">
                {services.map((svc) => (
                  <div key={svc.id} className="flex justify-between items-center text-sm">
                    <span className="text-foreground">{svc.name}</span>
                    <span className="text-muted-foreground">
                      ${svc.price.toFixed(2)} &middot; {svc.durationMin}min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Booking flow */}
        <BookingFlow
          store={store}
          services={services}
          paymentAccounts={data.paymentAccounts}
          slug={slug}
          employeeId={employee.id}
          showHeader={false}
          onComplete={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />

        <p className="text-center text-[10px] text-muted-foreground/50 mt-8">
          Powered by Panitas
        </p>
      </div>
    </div>
  )
}
