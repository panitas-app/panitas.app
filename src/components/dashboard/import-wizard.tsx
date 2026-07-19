"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Download, Sparkles, ArrowRight, CircleDot, Columns3, FileCheck2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DetectedColumn } from "@/lib/import-engine"

interface Props {
  storeId: string
  categories: { id: string; name: string }[]
}

interface AIProduct {
  name: string
  price: number
  costPrice: number | null
  stock: number
  sku: string | null
  description: string | null
  category: string | null
  unidadBase: string
  isActive: boolean
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  price: "Precio",
  costPrice: "Costo",
  sku: "SKU",
  stock: "Stock",
  unidadBase: "Unidad",
  description: "Descripción",
  isActive: "Activo",
  featured: "Destacado",
  isWholesale: "Mayorista",
  wholesalePrice: "Precio mayorista",
  wholesaleLabel: "Etiqueta mayorista",
}

const REQUIRED_FIELDS = ["name", "price"]

const STEP_DEFS = [
  { key: "upload", label: "Subir archivo", icon: Upload },
  { key: "mapping", label: "Mapear columnas", icon: Columns3 },
  { key: "result", label: "Resultado", icon: FileCheck2 },
] as const

function ProgressSteps({ current }: { current: "upload" | "mapping" | "ai-confirm" | "result" }) {
  const activeIdx = current === "ai-confirm" ? 1 : STEP_DEFS.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center justify-center gap-0">
      {STEP_DEFS.map((step, i) => {
        const isActive = i === activeIdx
        const isDone = i < activeIdx
        const StepIcon = step.icon
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex size-10 items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-foreground/5 text-muted-foreground"
                }`}
              >
                <StepIcon className="size-4.5" />
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEP_DEFS.length - 1 && (
              <div className="mx-3 mb-6">
                <div className={`h-0.5 w-12 rounded-full transition-all duration-300 ${i < activeIdx ? "bg-primary/40" : "bg-foreground/5"}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ImportWizard({ storeId, categories }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<"upload" | "mapping" | "ai-confirm" | "result">("upload")
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<DetectedColumn[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [detectedCategories, setDetectedCategories] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; categoriesCreated: number; errors: string[] } | null>(null)

  const [aiProducts, setAiProducts] = useState<AIProduct[]>([])
  const [aiErrors, setAiErrors] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 100 })

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setLoading(true)
    setErrors([])

    const formData = new FormData()
    formData.append("file", selected)

    try {
      const res = await fetch("/api/products/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErrors([data.error || "Error al procesar archivo"])
        setLoading(false)
        return
      }

      setColumns(data.columns || [])
      setTotalRows(data.totalRows || 0)
      setDetectedCategories(data.categories || [])
      setAiUsage(data.aiUsage || { used: 0, limit: 100 })
      setStep("mapping")
    } catch {
      setErrors(["Error de conexión"])
    } finally {
      setLoading(false)
    }
  }, [])

  const updateColumnMapping = (header: string, field: string | null) => {
    setColumns((prev) =>
      prev.map((col) => (col.header === header ? { ...col, mappedField: field } : col))
    )
  }

  const requiredMappedCount = columns.filter(
    (c) => c.mappedField === "name" || c.mappedField === "price"
  ).length
  const allRequiredMapped = requiredMappedCount >= 2

  const handleAI = async () => {
    if (!file) return
    setAiLoading(true)
    setErrors([])
    setAiErrors([])

    const formData = new FormData()
    formData.append("file", file)
    formData.append("mode", "ai-parse")

    try {
      const res = await fetch("/api/products/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErrors([data.error || "Error al analizar con IA"])
        setAiLoading(false)
        return
      }

      setAiProducts(data.aiProducts || [])
      setAiErrors(data.aiErrors || [])
      setAiUsage(data.aiUsage || aiUsage)

      if ((data.aiProducts || []).length > 0) {
        setStep("ai-confirm")
      } else {
        setErrors(data.aiErrors?.length > 0 ? data.aiErrors : ["La IA no pudo extraer productos del archivo"])
      }
    } catch {
      setErrors(["Error de conexión con la IA"])
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIConfirm = async () => {
    if (!file || aiProducts.length === 0) return
    setLoading(true)
    setErrors([])

    const formData = new FormData()
    formData.append("file", file)
    formData.append("columns", JSON.stringify([]))
    formData.append("aiProducts", JSON.stringify(aiProducts))

    try {
      const res = await fetch("/api/products/import-ai", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErrors([data.error || "Error al importar"])
        setLoading(false)
        return
      }

      setResult({
        created: data.created,
        skipped: data.skipped,
        categoriesCreated: data.categoriesCreated || 0,
        errors: data.errors || [],
      })
      setStep("result")
    } catch {
      setErrors(["Error de conexión"])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setErrors([])

    const formData = new FormData()
    formData.append("file", file)
    formData.append("columns", JSON.stringify(columns))

    try {
      const res = await fetch("/api/products/import", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setErrors([data.error || "Error al importar"])
        setLoading(false)
        return
      }

      setResult({
        created: data.created,
        skipped: data.skipped,
        categoriesCreated: data.categoriesCreated || 0,
        errors: data.errors || [],
      })
      setStep("result")
    } catch {
      setErrors(["Error de conexión"])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = ["Nombre", "Precio", "Costo", "SKU", "Stock", "Unidad", "Descripción"]
    const example = ["Camiseta Básica", "15.00", "8.00", "CAM-001", "50", "Unidad", "Camiseta de algodón 100%"]
    const csv = [headers.join(","), example.join(",")].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "plantilla-productos.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <ProgressSteps current={step} />

      {errors.length > 0 && (
        <div className="glass-card flex items-start gap-3 p-4 text-sm text-destructive rounded-2xl border border-destructive/15">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Step 1: Upload ─── */}
      {step === "upload" && (
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Importar productos desde Excel
            </h2>
            <p className="text-sm text-muted-foreground">
              Sube un archivo Excel (.xlsx, .xls) o CSV con tu catálogo de productos.
              El sistema detectará automáticamente las columnas. Si el formato no es estándar, usa la IA para analizarlo.
            </p>
          </div>

          <div
            className="glass rounded-2xl border border-dashed border-primary/20 p-10 text-center cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="size-6 text-primary" />
            </div>
            <p className="text-base font-medium">Arrastra un archivo o haz clic para seleccionar</p>
            <p className="text-sm text-muted-foreground mt-1.5">Máximo 5MB · .xlsx, .xls, .csv</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex items-center justify-between">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="size-3.5" />
              Descargar plantilla CSV
            </button>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Procesando...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 2: Mapping ─── */}
      {step === "mapping" && (
        <div className="space-y-4">
          {/* Header info */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2 mb-1">
              <Columns3 className="size-5 text-primary" />
              Mapear columnas
            </h2>
            <p className="text-sm text-muted-foreground">
              {totalRows} filas detectadas{detectedCategories.length > 0 ? `, ${detectedCategories.length} categorías encontradas` : ""}.
              Asigna cada columna del archivo a un campo de producto.
            </p>

            {detectedCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {detectedCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs bg-primary/8 text-primary/70 border-primary/10 rounded-full px-2.5">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Column mapping rows */}
          <div className="space-y-2.5">
            {columns.map((col) => {
              const isRequired = col.mappedField !== null && REQUIRED_FIELDS.includes(col.mappedField)
              return (
                <div
                  key={col.header}
                  className={`glass-card rounded-2xl p-4 transition-all ${
                    isRequired ? "ring-1 ring-primary/15" : ""
                  }`}
                >
                  {/* Row 1: Column name + badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm">{col.header}</span>
                    {col.mappedField && (
                      <Badge
                        variant={isRequired ? "default" : "secondary"}
                        className={`text-[10px] px-2 py-0 ${
                          isRequired
                            ? "bg-primary/10 text-primary border-primary/15"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isRequired ? "Requerido" : "Opcional"}
                      </Badge>
                    )}
                  </div>

                  {/* Row 2: Sample values */}
                  {col.sampleValues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {col.sampleValues.slice(0, 3).map((v, i) => (
                        <span key={i} className="inline-block text-[11px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5 max-w-[140px] truncate">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 3: Mapping selector */}
                  <div className="flex items-center gap-2.5">
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Mapear a:</span>
                    <Select
                      value={col.mappedField || "none"}
                      onValueChange={(v) => updateColumnMapping(col.header, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-9 flex-1 rounded-xl text-sm">
                        <SelectValue placeholder="No importar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No importar</SelectItem>
                        {Object.entries(FIELD_LABELS).map(([field, label]) => (
                          <SelectItem key={field} value={field}>
                            {label}
                            {REQUIRED_FIELDS.includes(field) && " *"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Missing fields warning + AI button */}
          {!allRequiredMapped && (
            <div className="glass-card rounded-2xl p-4 border border-amber-200/60 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="size-4 shrink-0" />
                Faltan campos requeridos: Nombre y Precio (*)
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-amber-600/80">Formato no estándar?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAI}
                  disabled={aiLoading || aiUsage.used >= aiUsage.limit}
                  className="rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary h-8 text-xs"
                >
                  {aiLoading ? (
                    <>
                      <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 mr-1.5" />
                      Analizar con IA
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {aiUsage.used}/{aiUsage.limit} usos hoy
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep("upload")} className="rounded-xl text-muted-foreground">
              <ChevronLeft className="size-4 mr-1" />
              Volver
            </Button>
            {allRequiredMapped && (
              <Button onClick={handleImport} disabled={loading} className="rounded-xl px-6 shadow-lg shadow-primary/10">
                {loading ? (
                  <>
                    <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    Importar {totalRows} productos
                    <ChevronRight className="size-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 2b: AI Confirm ─── */}
      {step === "ai-confirm" && (
        <div className="glass-card rounded-3xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Resultado del análisis con IA
            </h2>
            <p className="text-sm text-muted-foreground">
              La IA extrajo <strong className="text-foreground">{aiProducts.length}</strong> productos de tu archivo.
              Revisa la lista y confirma para importar.
            </p>
          </div>

          {aiErrors.length > 0 && (
            <div className="glass rounded-xl p-3 text-sm border border-amber-200/50 bg-amber-50/30">
              <p className="font-medium text-amber-700 mb-1 text-xs">Avisos:</p>
              {aiErrors.slice(0, 10).map((e, i) => (
                <div key={i} className="text-amber-600 text-xs">{e}</div>
              ))}
              {aiErrors.length > 10 && <div className="text-amber-600 text-xs">...y {aiErrors.length - 10} más</div>}
            </div>
          )}

          <div className="glass rounded-2xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-border/50 bg-muted/30 backdrop-blur-sm">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Nombre</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Precio</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Costo</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Stock</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {aiProducts.map((p, i) => (
                    <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-primary/[0.02] transition-colors">
                      <td className="px-4 py-2 font-medium text-sm">{p.name}</td>
                      <td className="px-4 py-2 text-right text-sm">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-sm text-muted-foreground">{p.costPrice != null ? `$${p.costPrice.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-2 text-right text-sm">{p.stock}</td>
                      <td className="px-4 py-2">
                        {p.category && (
                          <Badge variant="secondary" className="text-[10px] bg-primary/8 text-primary/70 border-primary/10 rounded-full px-2 py-0">
                            {p.category}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="ghost" onClick={() => setStep("mapping")} className="rounded-xl text-muted-foreground">
              <ChevronLeft className="size-4 mr-1" />
              Volver al mapeo manual
            </Button>
            <Button onClick={handleAIConfirm} disabled={loading || aiProducts.length === 0} className="rounded-xl px-6 shadow-lg shadow-primary/10">
              {loading ? (
                <>
                  <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  Importar {aiProducts.length} productos
                  <ChevronRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Result ─── */}
      {step === "result" && result && (
        <div className="glass-card rounded-3xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle className="size-5 text-emerald-500" />
              ) : (
                <AlertCircle className="size-5 text-amber-500" />
              )}
              Importación completada
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-emerald-500">{result.created}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Creados</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-amber-500">{result.skipped}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Omitidos</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-destructive">{result.errors.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Errores</div>
            </div>
          </div>

          {result.categoriesCreated > 0 && (
            <div className="glass rounded-xl p-3 text-sm text-center text-muted-foreground">
              {result.categoriesCreated} {result.categoriesCreated === 1 ? "categoría creada" : "categorías creadas"} automáticamente
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Errores:</h4>
              <div className="glass rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-sm text-destructive px-2 py-1 bg-destructive/5 rounded-lg">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => router.push("/dashboard/products")} className="rounded-xl text-muted-foreground">
              Ver productos
            </Button>
            <Button onClick={() => { setStep("upload"); setFile(null); setResult(null); setAiProducts([]) }} className="rounded-xl px-6 shadow-lg shadow-primary/10">
              Importar otro archivo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
