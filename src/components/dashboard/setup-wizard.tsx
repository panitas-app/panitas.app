"use client"

import { useState, useRef, type FormEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Store, Calendar, CreditCard, Clock, Check, Upload, MapPin, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Props {
  storeId: string
  negocioId: string | null
  planType: "agenda" | "comercio" | "mayorista"
  completedSteps: number[]
  onCompleteStep: (step: number) => void
  onClose: () => void
}

interface DaySchedule {
  active: boolean
  open: string
  close: string
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const stepsConfig: Record<string, { title: string; description: string; icon: React.ReactNode }[]> = {
  mayorista: [
    { title: "Nombre y logo", description: "Define el nombre de tu empresa y agrega tu logo", icon: <Store className="size-5" /> },
  ],
  agenda: [
    { title: "Datos del negocio", description: "Nombre, descripción y enlace público para tus clientes", icon: <Calendar className="size-5" /> },
    { title: "Métodos de pago", description: "Agrega cuentas bancarias o pago móvil para cobrar", icon: <CreditCard className="size-5" /> },
    { title: "Horarios de atención", description: "Configura los días y horarios de tu agenda", icon: <Clock className="size-5" /> },
    { title: "Dirección del negocio", description: "Dirección completa para que te ubiquen", icon: <MapPin className="size-5" /> },
  ],
  comercio: [
    { title: "Datos del negocio", description: "Nombre, descripción y enlace de tu tienda online", icon: <Store className="size-5" /> },
    { title: "Métodos de pago", description: "Agrega cuentas bancarias o pago móvil para cobrar", icon: <CreditCard className="size-5" /> },
    { title: "Horarios de atención", description: "Configura los días y horarios de tu tienda", icon: <Clock className="size-5" /> },
    { title: "Dirección del negocio", description: "Dirección completa para entregas y envíos", icon: <MapPin className="size-5" /> },
  ],
}

const totalSteps: Record<string, number> = { mayorista: 1, agenda: 4, comercio: 4 }

export function SetupWizard({ storeId, negocioId, planType, completedSteps, onCompleteStep, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [customLink, setCustomLink] = useState("")
  const [address, setAddress] = useState("")
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(WEEKDAYS.map((d) => [d, { active: d !== "Domingo", open: "08:00", close: "17:00" }]))
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const steps = stepsConfig[planType] || stepsConfig.comercio
  const total = totalSteps[planType] || 3

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogo(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let logoUrl: string | null = null
      if (logo) {
        const fd = new FormData()
        fd.append("file", logo)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          logoUrl = uploadData.url
        }
      }

      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          address: address || undefined,
          logo: logoUrl || undefined,
          storeHours: planType !== "mayorista" ? JSON.stringify(schedule) : undefined,
        }),
      })

      if (!res.ok) throw new Error("Error al guardar")

      onCompleteStep(step)

      if (step < total) {
        setStep(step + 1)
      } else {
        toast.success("Configuración completada")
        onClose()
      }
    } catch {
      toast.error("Error al guardar. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  async function skipStep() {
    if (step < total) {
      setStep(step + 1)
    } else {
      onClose()
    }
  }

  const allCompleted = completedSteps.length >= total

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A33]/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {steps[step - 1]?.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#050505]">{steps[step - 1]?.title}</h2>
              <p className="text-xs text-muted-foreground">{steps[step - 1]?.description}</p>
            </div>
          </div>
          {allCompleted && (
            <button onClick={onClose} className="text-muted-foreground hover:text-[#050505]">
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-3 pb-1">
          <div className="flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  completedSteps.includes(i + 1) ? "bg-primary" : step === i + 1 ? "bg-primary/40" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-right mt-1">
            Paso {step} de {total}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* STEP 1: Name + Description + Link + Logo */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Nombre del negocio</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Barbería El Peluquero" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe tu negocio..." rows={3} />
                  </div>
                  {planType !== "mayorista" && (
                    <div className="space-y-1.5">
                      <Label>Enlace personalizado</Label>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>panitas.app/</span>
                        <Input value={customLink} onChange={(e) => setCustomLink(e.target.value)} placeholder="mi-tienda" className="flex-1" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4">
                      {logoPreview && (
                        <img src={logoPreview} alt="Preview" className="size-16 rounded-lg object-cover border" />
                      )}
                      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-muted-foreground hover:bg-gray-50">
                        <Upload className="size-4" />
                        {logoPreview ? "Cambiar" : "Subir logo"}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Payment methods (Agenda / Comercio) */}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Agrega al menos un método de pago para que tus clientes puedan pagarte. Puedes saltar este paso y configurarlo después.</p>
                  <PaymentMethodForm storeId={storeId} />
                </div>
              )}

              {/* STEP 3: Schedule (Agenda / Comercio) */}
              {step === 3 && (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {WEEKDAYS.map((day) => {
                    const s = schedule[day]
                    return (
                      <div key={day} className="flex items-center gap-3 p-2 rounded-lg border">
                        <label className="flex items-center gap-2 text-sm font-medium min-w-24">
                          <input type="checkbox" checked={s.active} onChange={() => setSchedule({ ...schedule, [day]: { ...s, active: !s.active } })} className="rounded" />
                          {day}
                        </label>
                        {s.active && (
                          <div className="flex items-center gap-2 ml-auto">
                            <input type="time" value={s.open} onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, open: e.target.value } })} className="px-2 py-1 border rounded text-sm" />
                            <span className="text-muted-foreground">a</span>
                            <input type="time" value={s.close} onChange={(e) => setSchedule({ ...schedule, [day]: { ...s, close: e.target.value } })} className="px-2 py-1 border rounded text-sm" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* STEP 4: Address (Agenda / Comercio) */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Dirección completa</Label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej: Av. Principal, Edif. Centro, Local 2, Urb. Las Mercedes, Caracas 1060"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={skipStep} className="text-xs text-muted-foreground hover:text-[#050505]">
              {step < total ? "Saltar este paso" : "Omitir y cerrar"}
            </button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="text-xs">
                  Atrás
                </Button>
              )}
              <Button type="submit" disabled={saving} className="text-xs bg-primary text-accent">
                {saving ? "Guardando..." : step < total ? "Continuar" : "Finalizar"}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function PaymentMethodForm({ storeId }: { storeId: string }) {
  const [methods, setMethods] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<"bank" | "mobile" | "binancepay">("bank")
  const [bankName, setBankName] = useState("")
  const [accountType, setAccountType] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [documentId, setDocumentId] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneBank, setPhoneBank] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadMethods() {
    try {
      const res = await fetch("/api/payment-accounts")
      if (res.ok) setMethods(await res.json())
    } catch {}
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body: any = { type, storeId }
      if (type === "bank") {
        body.bankName = bankName
        body.accountType = accountType
        body.accountNumber = accountNumber
        body.accountHolder = accountHolder
        body.documentId = documentId
      } else if (type === "mobile") {
        body.phone = phone
        body.phoneBank = phoneBank
        body.accountHolder = accountHolder
        body.documentId = documentId
      } else if (type === "binancepay") {
        body.email = accountNumber // store email in accountNumber field
        body.accountHolder = accountHolder
      }
      const res = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Método de pago agregado")
      setShowForm(false)
      resetForm()
      loadMethods()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setBankName(""); setAccountType(""); setAccountNumber(""); setAccountHolder(""); setDocumentId(""); setPhone(""); setPhoneBank("")
  }

  return (
    <div className="space-y-3">
      {methods.length > 0 && (
        <ul className="space-y-1">
          {methods.map((m) => (
            <li key={m.id} className="text-xs text-muted-foreground flex items-center gap-2">
              <Check className="size-3 text-green-500" />
              {m.type === "bank" ? `${m.bankName} - ${m.accountNumber}` : m.type === "mobile" ? `${m.phoneBank} - ${m.phone}` : "Binance Pay"}
            </li>
          ))}
        </ul>
      )}
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="text-xs text-primary font-semibold hover:underline">
          + Agregar método de pago
        </button>
      ) : (
        <form onSubmit={handleAdd} className="space-y-2 p-3 border rounded-lg bg-gray-50">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType("bank")} className={`flex-1 py-1.5 text-xs font-semibold rounded ${type === "bank" ? "bg-primary text-white" : "bg-white border"}`}>Banco</button>
            <button type="button" onClick={() => setType("mobile")} className={`flex-1 py-1.5 text-xs font-semibold rounded ${type === "mobile" ? "bg-primary text-white" : "bg-white border"}`}>Pago Móvil</button>
            <button type="button" onClick={() => setType("binancepay")} className={`flex-1 py-1.5 text-xs font-semibold rounded ${type === "binancepay" ? "bg-primary text-white" : "bg-white border"}`}>Binance Pay</button>
          </div>
          {type === "bank" ? (
            <>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Nombre del banco" size={1} required />
              <div className="flex gap-2">
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-xs" required>
                  <option value="">Tipo</option>
                  <option value="corriente">Corriente</option>
                  <option value="ahorro">Ahorro</option>
                </select>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Número de cuenta" size={1} required />
              </div>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Titular" size={1} required />
              <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="RIF / Cédula" size={1} />
            </>
          ) : type === "mobile" ? (
            <>
              <div className="flex gap-2">
                <Input value={phoneBank} onChange={(e) => setPhoneBank(e.target.value)} placeholder="Banco (ej: Banesco)" size={1} required />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" size={1} required />
              </div>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Titular" size={1} required />
              <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="RIF / Cédula" size={1} />
            </>
          ) : (
            <>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Email / ID de Binance" size={1} required />
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Titular" size={1} />
            </>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1 text-xs bg-primary text-accent">{saving ? "..." : "Guardar"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="text-xs">Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  )
}
