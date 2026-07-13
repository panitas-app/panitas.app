"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, CalendarPlus } from "lucide-react"
import Link from "next/link"

interface Employee { id: string; name: string }
interface Service { id: string; name: string; duration?: number }

export default function NuevaCitaPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [employeeId, setEmployeeId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [time, setTime] = useState("10:00")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/employees").then(r => r.ok && r.json()).then(setEmployees).catch(() => {})
    fetch("/api/services").then(r => r.ok && r.json()).then(setServices).catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Nombre y teléfono del cliente son requeridos")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          date,
          time,
          serviceId: serviceId || undefined,
          employeeId: employeeId || undefined,
          notes: notes.trim() || null,
          appointmentType: "manual",
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Cita registrada exitosamente")
      router.push("/dashboard/agenda")
    } catch {
      toast.error("Error al crear la cita")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/agenda" className="text-muted-foreground hover:text-[#050505]">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarPlus className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#050505]">Nueva cita manual</h1>
          <p className="text-xs text-muted-foreground">Registra una cita para clientes que llaman o reservan en persona</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre del cliente</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej: María Pérez" required />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0412-1234567" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Servicio (opcional)</Label>
                <Select value={serviceId} onValueChange={(v) => v && setServiceId(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Empleado (opcional)</Label>
                <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo de la cita, indicaciones, etc." rows={2} />
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-primary text-accent">
              {saving ? "Guardando..." : "Registrar cita"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
