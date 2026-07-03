"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, Pencil, Trash2, UserCircle, MapPin } from "lucide-react"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string
  email: string | null
  phone: string | null
  photo: string | null
  position: string | null
  isActive: boolean
  remunerationType: string | null
  branch: { id: string; name: string } | null
  services: { service: { id: string; name: string } }[]
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees")
      if (res.ok) setEmployees(await res.json())
    } catch { toast.error("Error al cargar empleados") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEmployees() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name}?`)) return
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Empleado eliminado"); fetchEmployees() }
    else toast.error("Error al eliminar")
  }

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  )

  const remunerationLabels: Record<string, string> = {
    percentage: "Comisión %",
    fixed_per_service: "Comisión fija",
    salary: "Salario fijo",
    rental: "Alquiler",
    mixed: "Mixto",
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent">Empleados</h1>
          <p className="text-sm text-muted-foreground">Gestiona el equipo de trabajo de tu negocio</p>
        </div>
        <Link href="/dashboard/employees/new">
          <Button className="rounded-xl bg-primary text-accent font-bold gap-2">
            <Plus className="size-4" /> Nuevo empleado
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl border-border bg-card" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl border-border/50 animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded-xl" /></CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <UserCircle className="size-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay empleados registrados</p>
            <p className="text-sm">Crea tu primer empleado para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className="rounded-2xl border-border/50 hover:border-primary/20 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {emp.photo ? <img src={emp.photo} alt="" className="size-12 rounded-full object-cover" /> : emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-accent">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.position || "Sin cargo"}</p>
                    </div>
                  </div>
                  <Badge variant={emp.isActive ? "default" : "secondary"} className="text-[10px]">
                    {emp.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {emp.branch && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" /> {emp.branch.name}
                    </div>
                  )}
                  {emp.remunerationType && (
                    <Badge variant="outline" className="text-[10px]">
                      {remunerationLabels[emp.remunerationType] || emp.remunerationType}
                    </Badge>
                  )}
                  {emp.services.length > 0 && (
                    <p className="truncate">{emp.services.length} servicio(s) asignado(s)</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                  <Link href={`/dashboard/employees/${emp.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-lg gap-1.5 text-xs">
                      <Pencil className="size-3" /> Editar
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(emp.id, emp.name)}
                    className="rounded-lg text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5">
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
