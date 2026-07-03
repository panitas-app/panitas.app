"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Upload } from "lucide-react"
import { toast } from "sonner"

interface Branch { id: string; name: string }

const remunerationOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "percentage", label: "Comisión porcentual" },
  { value: "fixed_per_service", label: "Comisión fija por servicio" },
  { value: "salary", label: "Salario fijo mensual" },
  { value: "rental", label: "Alquiler" },
  { value: "mixed", label: "Mixto (salario + comisión)" },
]

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", photo: "", position: "", publicSlug: "",
    isActive: true, remunerationType: "", commissionDefault: "", salary: "",
    rentalAmount: "", mixedSalary: "", mixedCommission: "", branchId: "",
  })

  useEffect(() => {
    fetch("/api/branches").then((r) => r.json()).then(setBranches).catch(() => {})
    if (id === "new") return
    fetch(`/api/employees/${id}`).then((r) => r.json()).then((data) => {
      setForm({
        name: data.name || "", email: data.email || "", phone: data.phone || "",
        photo: data.photo || "", position: data.position || "", publicSlug: data.publicSlug || "",
        isActive: data.isActive ?? true,
        remunerationType: data.remunerationType || "",
        commissionDefault: data.commissionDefault?.toString() || "",
        salary: data.salary?.toString() || "", rentalAmount: data.rentalAmount?.toString() || "",
        mixedSalary: data.mixedSalary?.toString() || "", mixedCommission: data.mixedCommission?.toString() || "",
        branchId: data.branchId || "",
      })
    }).catch(() => toast.error("Error al cargar empleado"))
  }, [id])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    const method = id === "new" ? "POST" : "PATCH"
    const url = id === "new" ? "/api/employees" : `/api/employees/${id}`
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(id === "new" ? "Empleado creado" : "Empleado actualizado")
      router.push("/dashboard/employees")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Error al guardar")
    }
  }

  const isNew = id === "new"

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-accent">{isNew ? "Nuevo empleado" : "Editar empleado"}</h1>
          <p className="text-sm text-muted-foreground">{isNew ? "Agrega un nuevo miembro a tu equipo" : "Actualiza la información del empleado"}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-border/50 md:col-span-2">
          <CardHeader><CardTitle className="text-lg">Información general</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Carlos Pérez" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="carlos@ejemplo.com" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+584141234567" className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cargo / Puesto</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Ej. Barbero, Recepcionista, Gerente" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Select value={form.branchId} onValueChange={(v) => v !== null && setForm({ ...form, branchId: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sin sucursal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sucursal</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Slug público</Label>
                <Input value={form.publicSlug} onChange={(e) => setForm({ ...form, publicSlug: e.target.value })}
                  placeholder="carlos-perez" className="rounded-xl" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label className="cursor-pointer">Empleado activo</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader><CardTitle className="text-lg">Foto</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <div className="size-28 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl overflow-hidden">
                {form.photo ? <img src={form.photo} alt="" className="size-full object-cover" /> : form.name.charAt(0).toUpperCase() || <Upload className="size-8 opacity-40" />}
              </div>
              <Input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })}
                placeholder="URL de la foto" className="rounded-xl text-xs" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardHeader><CardTitle className="text-lg">Remuneración</CardTitle><CardDescription>Configura cómo se le paga a este empleado</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo de remuneración</Label>
            <Select value={form.remunerationType} onValueChange={(v) => v !== null && setForm({ ...form, remunerationType: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {remunerationOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.remunerationType === "percentage" && (
            <div className="space-y-1.5">
              <Label>Porcentaje de comisión (%)</Label>
              <Input type="number" value={form.commissionDefault} onChange={(e) => setForm({ ...form, commissionDefault: e.target.value })}
                placeholder="70" className="rounded-xl max-w-xs" />
            </div>
          )}
          {form.remunerationType === "salary" && (
            <div className="space-y-1.5">
              <Label>Salario mensual ($)</Label>
              <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="300" className="rounded-xl max-w-xs" />
            </div>
          )}
          {form.remunerationType === "rental" && (
            <div className="space-y-1.5">
              <Label>Alquiler mensual ($)</Label>
              <Input type="number" value={form.rentalAmount} onChange={(e) => setForm({ ...form, rentalAmount: e.target.value })}
                placeholder="150" className="rounded-xl max-w-xs" />
            </div>
          )}
          {form.remunerationType === "mixed" && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-1.5">
                <Label>Salario fijo ($)</Label>
                <Input type="number" value={form.mixedSalary} onChange={(e) => setForm({ ...form, mixedSalary: e.target.value })}
                  placeholder="200" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Comisión (%)</Label>
                <Input type="number" value={form.mixedCommission} onChange={(e) => setForm({ ...form, mixedCommission: e.target.value })}
                  placeholder="30" className="rounded-xl" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary text-accent font-bold gap-2">
          <Save className="size-4" /> {saving ? "Guardando..." : "Guardar empleado"}
        </Button>
      </div>
    </div>
  )
}
