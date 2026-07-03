"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import {
  Receipt, Plus, Search, Filter, Download, TrendingUp,
  Building2, CreditCard, Banknote, Smartphone, Landmark,
  PiggyBank, ShoppingBag, Home, Car, Utensils, Wifi,
  Package, Shirt, Heart, GraduationCap, MoreHorizontal, X,
} from "lucide-react"

const EXPENSE_CATEGORIES = [
  { value: "nomina", label: "Nómina", icon: "👥" },
  { value: "alquiler", label: "Alquiler / Sede", icon: "🏠" },
  { value: "servicios", label: "Servicios (agua, luz, internet)", icon: "💡" },
  { value: "suministros", label: "Suministros de oficina", icon: "📎" },
  { value: "inventario", label: "Compra de inventario", icon: "📦" },
  { value: "envio", label: "Envíos / Logística", icon: "🚚" },
  { value: "marketing", label: "Marketing / Publicidad", icon: "📢" },
  { value: "comisiones", label: "Comisiones", icon: "💰" },
  { value: "transporte", label: "Transporte / Gasolina", icon: "🚗" },
  { value: "empaque", label: "Empaque / Embalaje", icon: "📋" },
  { value: "alimentacion", label: "Alimentación", icon: "🍽️" },
  { value: "salud", label: "Salud / Seguro", icon: "🏥" },
  { value: "educacion", label: "Educación / Capacitación", icon: "🎓" },
  { value: "impuestos", label: "Impuestos / Tasas", icon: "📊" },
  { value: "legal", label: "Honorarios legales / Contables", icon: "⚖️" },
  { value: "mantenimiento", label: "Mantenimiento / Reparaciones", icon: "🔧" },
  { value: "tecnologia", label: "Tecnología / Software", icon: "💻" },
  { value: "publicidad", label: "Pauta digital / Redes sociales", icon: "📱" },
  { value: "suscripciones", label: "Suscripciones", icon: "🔄" },
  { value: "otros", label: "Otros", icon: "📌" },
]

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo", icon: Banknote },
  { value: "bank_transfer", label: "Transferencia bancaria", icon: Landmark },
  { value: "pago_movil", label: "Pago Móvil", icon: Smartphone },
  { value: "credit_card", label: "Tarjeta de crédito", icon: CreditCard },
  { value: "debit_card", label: "Tarjeta de débito", icon: CreditCard },
  { value: "zelle", label: "Zelle", icon: Building2 },
  { value: "paypal", label: "PayPal", icon: Building2 },
  { value: "divisas", label: "Divisas / Efectivo USD", icon: Banknote },
]

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  subcategory: string
  date: string
  paymentMethod: string
  vendor: string
  documentRef: string
  isDeductible: boolean
  isRecurring: boolean
  notes: string | null
}

interface Budget {
  id: string
  category: string
  amount: number
  month: number
  year: number
}

export default function GastosPage() {
  const [view, setView] = useState<"dashboard" | "register" | "list">("dashboard")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Gestión de Gastos</h1>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "dashboard" ? "default" : "outline"} onClick={() => setView("dashboard")}>
            <TrendingUp className="size-4 mr-1" /> Dashboard
          </Button>
          <Button size="sm" variant={view === "register" ? "default" : "outline"} onClick={() => setView("register")}>
            <Plus className="size-4 mr-1" /> Nuevo gasto
          </Button>
          <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
            <Filter className="size-4 mr-1" /> Historial
          </Button>
        </div>
      </div>

      {view === "dashboard" && <ExpenseDashboard />}
      {view === "register" && <ExpenseForm onSuccess={() => setView("dashboard")} />}
      {view === "list" && <ExpenseList />}
    </div>
  )
}

function ExpenseDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => r.ok ? r.json() : { data: [], byCategory: {}, total: 0, grandTotal: 0 }),
      fetch("/api/expenses/budgets").then((r) => r.ok ? r.json() : { budgets: [], spending: {} }),
    ]).then(([e, b]) => {
      setExpenses(e.data || [])
      setSpending(e.byCategory || {})
      setBudgets(b.budgets || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const totalGastos = expenses.reduce((s, e) => s + e.amount, 0)
  const thisMonth = new Date().getMonth() + 1
  const thisYear = new Date().getFullYear()
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear
  })
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)

  const catLabels: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))
  const maxCategory = Math.max(...Object.values(spending), 1)

  const categoryChartData = Object.entries(spending)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)

  if (loading) {
    return <div className="flex min-h-[30vh] items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-5">
            <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Total gastos</p>
            <p className="font-heading text-2xl font-bold text-red-700 mt-1">${totalGastos.toFixed(2)}</p>
            <p className="text-[10px] text-red-500 mt-0.5">Histórico completo</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardContent className="p-5">
            <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Este mes</p>
            <p className="font-heading text-2xl font-bold text-orange-700 mt-1">${monthTotal.toFixed(2)}</p>
            <p className="text-[10px] text-orange-500 mt-0.5">{MONTHS[thisMonth - 1]} {thisYear}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-5">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Presupuestado</p>
            <p className="font-heading text-2xl font-bold text-blue-700 mt-1">${totalBudgeted.toFixed(2)}</p>
            <p className="text-[10px] text-blue-500 mt-0.5">{budgets.length} categorías con presupuesto</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${
          totalBudgeted > 0 && monthTotal > totalBudgeted
            ? "from-red-50 to-red-100/50 border-red-200"
            : "from-green-50 to-green-100/50 border-green-200"
        }`}>
          <CardContent className="p-5">
            <p className={`text-xs font-medium uppercase tracking-wider ${
              totalBudgeted > 0 && monthTotal > totalBudgeted ? "text-red-600" : "text-green-600"
            }`}>
              {totalBudgeted > 0 && monthTotal > totalBudgeted ? "Sobre presupuesto" : "Dentro del presupuesto"}
            </p>
            <p className={`font-heading text-2xl font-bold mt-1 ${
              totalBudgeted > 0 && monthTotal > totalBudgeted ? "text-red-700" : "text-green-700"
            }`}>
              {totalBudgeted > 0
                ? `${((monthTotal / totalBudgeted) * 100).toFixed(0)}%`
                : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalBudgeted > 0
                ? `$${monthTotal.toFixed(2)} de $${totalBudgeted.toFixed(2)}`
                : "Sin presupuesto definido"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual per category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Presupuesto mensual vs gasto real</CardTitle>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No has definido presupuestos mensuales. Ve a "Registrar gasto" y asigna presupuestos por categoría.
            </p>
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const spent = spending[b.category] || 0
                const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0
                const isOver = spent > b.amount
                return (
                  <div key={b.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{catLabels[b.category] || b.category}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={isOver ? "text-red-600 font-semibold" : "text-green-600"}>
                          ${spent.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">/ ${b.amount.toFixed(2)}</span>
                        <span className={`font-semibold ${isOver ? "text-red-600" : "text-muted-foreground"}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver ? "bg-red-500" : pct > 80 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending by category chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gastos por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin gastos registrados</p>
          ) : (
            <div className="space-y-3">
              {categoryChartData.map(([cat, amount]) => {
                const pct = (amount / maxCategory) * 100
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-xs truncate">{catLabels[cat] || cat}</span>
                      <span className="text-xs font-semibold">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-5 w-full rounded-lg bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimos gastos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No hay gastos registrados</p>
          ) : (
            <div className="divide-y">
              {expenses.slice(0, 10).map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{e.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{catLabels[e.category] || e.category}</span>
                      {e.vendor && <span className="text-[10px] text-muted-foreground">{e.vendor}</span>}
                      <span className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString("es-VE")}</span>
                    </div>
                  </div>
                  <p className="font-semibold text-red-600 ml-4">-${e.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("otros")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [vendor, setVendor] = useState("")
  const [documentRef, setDocumentRef] = useState("")
  const [isDeductible, setIsDeductible] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Budget management
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetCategory, setBudgetCategory] = useState("")
  const [budgetAmount, setBudgetAmount] = useState("")
  const [budgetSubmitting, setBudgetSubmitting] = useState(false)

  useEffect(() => {
    fetch("/api/expenses/budgets").then((r) => r.ok ? r.json() : { budgets: [] })
      .then((d) => setBudgets(d.budgets || []))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description || !amount) { toast.error("Descripción y monto obligatorios"); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description, amount: parseFloat(amount), category, date, paymentMethod,
          vendor, documentRef, isDeductible, isRecurring, notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Gasto registrado exitosamente")
      setDescription(""); setAmount(""); setCategory("otros"); setVendor(""); setDocumentRef(""); setNotes(""); setIsDeductible(false); setIsRecurring(false)
      onSuccess()
    } catch { toast.error("Error al registrar el gasto") }
    finally { setSubmitting(false) }
  }

  async function handleBudgetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!budgetCategory || !budgetAmount) { toast.error("Selecciona categoría y monto"); return }
    setBudgetSubmitting(true)
    try {
      const res = await fetch("/api/expenses/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: budgetCategory, amount: parseFloat(budgetAmount) }),
      })
      if (!res.ok) throw new Error("Error")
      const b = await res.json()
      setBudgets((prev) => {
        const filtered = prev.filter((x) => x.category !== b.category)
        return [...filtered, b]
      })
      setBudgetCategory(""); setBudgetAmount("")
      toast.success("Presupuesto guardado")
    } catch { toast.error("Error al guardar presupuesto") }
    finally { setBudgetSubmitting(false) }
  }

  const catLabels: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))
  const paymentLabels: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((c) => [c.value, c.label]))

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Main form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Registrar gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Compra de empaques para pedidos" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input className="pl-7" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={(v) => v !== null && setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span>{c.icon}</span> {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={paymentMethod} onValueChange={(v) => v !== null && setPaymentMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((p) => {
                      const Icon = p.icon
                      return (
                        <SelectItem key={p.value} value={p.value}>
                          <Icon className="size-3.5 inline mr-1.5" /> {p.label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Proveedor / Beneficiario</Label>
                <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Ej: Distribuidora XYZ" />
              </div>
              <div className="space-y-2">
                <Label>Nro. de referencia / Factura</Label>
                <Input value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} placeholder="Ej: FAC-001234" />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isDeductible} onChange={(e) => setIsDeductible(e.target.checked)} className="rounded" />
                <span className="text-sm">Deducible de ISLR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded" />
                <span className="text-sm">Gasto recurrente</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label>Notas adicionales</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comentarios, detalles, etc..." />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <Receipt className="size-4" />
              {submitting ? "Registrando..." : "Registrar gasto"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Budget sidebar */}
      <div className="space-y-6">
        {/* Current budgets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Presupuestos del mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin presupuestos definidos</p>
            ) : (
              budgets.map((b) => (
                <div key={b.category} className="flex items-center justify-between text-sm">
                  <span className="text-xs">{catLabels[b.category] || b.category}</span>
                  <span className="font-semibold">${b.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Set budget form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Asignar presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBudgetSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Categoría</Label>
                <Select value={budgetCategory} onValueChange={(v) => v !== null && setBudgetCategory(v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Monto mensual</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input className="pl-7 text-sm" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full" disabled={budgetSubmitting}>
                {budgetSubmitting ? "Guardando..." : "Guardar presupuesto"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick info */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-semibold text-blue-700">Consejo</p>
            <p className="text-[11px] text-blue-600">
              Asigna presupuestos mensuales por categoría para controlar mejor tus gastos y recibir alertas cuando te acerques al límite.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("todas")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const [expensesPage, setExpensesPage] = useState(1)
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesTotalPages, setExpensesTotalPages] = useState(0)

  const catLabels: Record<string, string> = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))
  const paymentLabels: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((c) => [c.value, c.label]))

  function loadExpenses() {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter !== "todas") params.set("category", categoryFilter)
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    if (search) params.set("search", search)
    params.set("page", String(expensesPage))
    params.set("sort", sortBy)
    params.set("order", sortDir)

    fetch(`/api/expenses?${params}`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0, totalPages: 0 })
      .then((d) => {
        setExpenses(d.data || [])
        setExpensesTotal(d.total || 0)
        setExpensesTotalPages(d.totalPages || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { setExpensesPage(1) }, [categoryFilter, dateFrom, dateTo, search, sortBy, sortDir])
  useEffect(() => { loadExpenses() }, [categoryFilter, dateFrom, dateTo, search, sortBy, sortDir, expensesPage])

  const totalFiltered = expenses.reduce((s, e) => s + e.amount, 0)

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir((d) => d === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortDir("desc") }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[10px]">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8 h-9 text-sm" placeholder="Descripción, proveedor, factura..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="w-44">
              <Label className="text-[10px]">Categoría</Label>
              <Select value={categoryFilter} onValueChange={(v) => v !== null && setCategoryFilter(v)}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Desde</Label>
              <Input type="date" className="h-9 mt-1 w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px]">Hasta</Label>
              <Input type="date" className="h-9 mt-1 w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setCategoryFilter("todas"); setDateFrom(""); setDateTo("") }}>
              <X className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {expensesTotal} gasto{expensesTotal !== 1 ? "s" : ""}
          {categoryFilter !== "todas" && ` en ${catLabels[categoryFilter]?.toLowerCase() || categoryFilter}`}
        </p>
        <p className="text-sm font-semibold text-red-600">Total: ${totalFiltered.toFixed(2)}</p>
      </div>

      {/* Expense list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : expenses.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No se encontraron gastos</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("date")}>
                      Fecha {sortBy === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("category")}>
                      Categoría {sortBy === "category" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 font-medium">Proveedor</th>
                    <th className="px-4 py-3 font-medium">Referencia</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort("amount")}>
                      Monto {sortBy === "amount" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 text-xs">{new Date(e.date).toLocaleDateString("es-VE")}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{e.description}</p>
                        {e.notes && <p className="text-[10px] text-muted-foreground">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {catLabels[e.category] || e.category}
                        </span>
                        {e.isDeductible && <span className="ml-1 text-[9px] text-green-600 font-semibold">D</span>}
                        {e.isRecurring && <span className="ml-1 text-[9px] text-blue-600 font-semibold">R</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{e.vendor || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{e.documentRef || "—"}</td>
                      <td className="px-4 py-3 text-[10px] text-muted-foreground">{paymentLabels[e.paymentMethod] || e.paymentMethod}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">-${e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={expensesPage}
            totalPages={expensesTotalPages}
            total={expensesTotal}
            onPageChange={setExpensesPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
