"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2, Banknote, Smartphone, Globe, DollarSign, HandCoins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { BANKS_VENEZUELA } from "@/lib/constants"

type PaymentMethod = {
  id: string
  type: string
  bankName: string | null
  bankCode: string | null
  accountType: string | null
  accountNumber: string | null
  accountHolder: string | null
  documentId: string | null
  phone: string | null
  phoneBank: string | null
  email: string | null
  isActive: boolean
  createdAt: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bank: <Banknote className="size-4" />,
  mobile: <Smartphone className="size-4" />,
  paypal: <Globe className="size-4" />,
  zelle: <DollarSign className="size-4" />,
  divisas: <HandCoins className="size-4" />,
}

const TYPE_LABELS: Record<string, string> = {
  bank: "Cuenta Bancaria",
  mobile: "Pago Móvil",
  paypal: "PayPal",
  zelle: "Zelle",
  divisas: "Divisas",
}

const ACCOUNT_TYPES = [
  { value: "corriente", label: "Corriente" },
  { value: "ahorro", label: "Ahorro" },
  { value: "juridica", label: "Jurídica" },
]

const emptyForm = {
  type: "bank",
  bankName: "",
  bankCode: "",
  accountType: "corriente",
  accountNumber: "",
  accountHolder: "",
  documentId: "",
  phone: "",
  phoneBank: "",
  email: "",
}

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadMethods() }, [])

  async function loadMethods() {
    try {
      const res = await fetch("/api/admin/payment-methods")
      if (res.ok) setMethods(await res.json())
    } catch { toast.error("Error al cargar métodos de pago") }
    finally { setLoading(false) }
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const url = editingId ? `/api/admin/payment-methods/${editingId}` : "/api/admin/payment-methods"
    const method = editingId ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || "Error al guardar")
      return
    }

    toast.success(editingId ? "Método actualizado" : "Método creado")
    resetForm()
    loadMethods()
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este método de pago?")) return
    const res = await fetch(`/api/admin/payment-methods/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Eliminado"); loadMethods() }
    else toast.error("Error al eliminar")
  }

  function editMethod(m: PaymentMethod) {
    setForm({
      type: m.type,
      bankName: m.bankName || "",
      bankCode: m.bankCode || "",
      accountType: m.accountType || "corriente",
      accountNumber: m.accountNumber || "",
      accountHolder: m.accountHolder || "",
      documentId: m.documentId || "",
      phone: m.phone || "",
      phoneBank: m.phoneBank || "",
      email: m.email || "",
    })
    setEditingId(m.id)
    setShowForm(true)
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-8 w-8 border-4 border-[#184BBF] border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#102A43]">Métodos de Pago</h1>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus className="size-4 mr-2" /> Agregar método
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? "Editar" : "Nuevo"} método de pago</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "bank" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank"><div className="flex items-center gap-2"><Banknote className="size-4" /> Bancaria</div></SelectItem>
                      <SelectItem value="mobile"><div className="flex items-center gap-2"><Smartphone className="size-4" /> Pago Móvil</div></SelectItem>
                      <SelectItem value="paypal"><div className="flex items-center gap-2"><Globe className="size-4" /> PayPal</div></SelectItem>
                      <SelectItem value="zelle"><div className="flex items-center gap-2"><DollarSign className="size-4" /> Zelle</div></SelectItem>
                      <SelectItem value="divisas"><div className="flex items-center gap-2"><HandCoins className="size-4" /> Divisas</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.type === "bank" && (
                  <>
                    <div className="space-y-1">
                      <Label>Banco</Label>
                      <Select value={form.bankCode || ""} onValueChange={(v) => {
                        const code = v ?? ""
                        const bank = BANKS_VENEZUELA.find(b => b.code === code)
                        setForm({ ...form, bankCode: code, bankName: bank?.name || code })
                      }}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                        <SelectContent>
                          {BANKS_VENEZUELA.map(b => (
                            <SelectItem key={b.code} value={b.code}>{b.code} - {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo de cuenta</Label>
                      <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v ?? "corriente" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ACCOUNT_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Número de cuenta</Label>
                      <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="20 dígitos" />
                    </div>
                    <div className="space-y-1">
                      <Label>Titular</Label>
                      <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Nombre del titular" />
                    </div>
                    <div className="space-y-1">
                      <Label>RIF/Cédula</Label>
                      <Input value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} placeholder="V-12345678" />
                    </div>
                  </>
                )}

                {form.type === "mobile" && (
                  <>
                    <div className="space-y-1">
                      <Label>Banco</Label>
                      <Select value={form.phoneBank || ""} onValueChange={(v) => setForm({ ...form, phoneBank: v ?? "" })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                        <SelectContent>
                          {BANKS_VENEZUELA.map(b => (
                            <SelectItem key={b.code} value={b.code}>{b.code} - {b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Teléfono</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="04121234567" />
                    </div>
                    <div className="space-y-1">
                      <Label>Titular</Label>
                      <Input value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Nombre del titular" />
                    </div>
                    <div className="space-y-1">
                      <Label>RIF/Cédula</Label>
                      <Input value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} placeholder="V-12345678" />
                    </div>
                  </>
                )}

                {(form.type === "paypal" || form.type === "zelle") && (
                  <div className="space-y-1 md:col-span-2">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" />
                  </div>
                )}

                {form.type === "divisas" && (
                  <div className="space-y-1 md:col-span-2">
                    <Label>Instrucciones / Referencia</Label>
                    <Input value={form.bankName || ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Ej: Transferencia en USD a cuenta bancaria en USA" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">{editingId ? "Actualizar" : "Guardar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {methods.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No has configurado métodos de pago. Agrega uno para que los usuarios puedan pagar sus suscripciones.</p>
        ) : methods.map((m) => (
          <Card key={m.id} className={!m.isActive ? "opacity-60" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#184BBF]/10 flex items-center justify-center text-[#184BBF]">
                  {TYPE_ICONS[m.type] || <Banknote className="size-5" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{TYPE_LABELS[m.type] || m.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type === "bank" && `${m.bankName} - ${m.accountType} - ${m.accountNumber}`}
                    {m.type === "mobile" && `${m.phoneBank} - ${m.phone}`}
                    {m.type === "paypal" && m.email}
                    {m.type === "zelle" && m.email}
                    {m.type === "divisas" && (m.bankName || "Divisas")}
                  </p>
                  {m.accountHolder && <p className="text-xs text-muted-foreground">Titular: {m.accountHolder}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {m.isActive ? "Activo" : "Inactivo"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => editMethod(m)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="size-4 text-red-500" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
