"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

    // Send AI products as the mapping
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step === "upload" ? "font-bold text-foreground" : ""}>1. Subir archivo</span>
        <ChevronRight className="size-4" />
        <span className={step === "mapping" || step === "ai-confirm" ? "font-bold text-foreground" : ""}>2. Revisar</span>
        <ChevronRight className="size-4" />
        <span className={step === "result" ? "font-bold text-foreground" : ""}>3. Resultado</span>
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div>
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              Importar productos desde Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Sube un archivo Excel (.xlsx, .xls) o CSV con tu catálogo de productos.
              El sistema detectará automáticamente las columnas. Si el formato no es estándar, usa la IA para analizarlo.
            </p>

            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Arrastra un archivo o haz clic para seleccionar</p>
              <p className="text-sm text-muted-foreground mt-1">Máximo 5MB • .xlsx, .xls, .csv</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex justify-between items-center">
              <Button variant="link" onClick={handleDownloadTemplate} className="text-sm">
                <Download className="size-4 mr-1" />
                Descargar plantilla CSV
              </Button>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle>Mapear columnas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {totalRows} filas detectadas{detectedCategories.length > 0 ? `, ${detectedCategories.length} categorías encontradas` : ""}.
              Asigna cada columna del archivo a un campo de producto.
              Las columnas con nombres similares se mapearon automáticamente.
            </p>

            {detectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-xs font-medium text-muted-foreground">Categorías detectadas:</span>
                {detectedCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {columns.map((col) => (
                <div key={col.header} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{col.header}</span>
                    <div className="flex gap-1 mt-1">
                      {col.sampleValues.slice(0, 3).map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <ChevronRight className="size-4 text-muted-foreground" />

                  <Select
                    value={col.mappedField || "none"}
                    onValueChange={(v) => updateColumnMapping(col.header, v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-48">
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

                  {col.mappedField && (
                    <Badge variant={REQUIRED_FIELDS.includes(col.mappedField) ? "default" : "secondary"}>
                      {REQUIRED_FIELDS.includes(col.mappedField) ? "Requerido" : "Opcional"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {!allRequiredMapped && (
              <div className="flex flex-col gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <AlertCircle className="size-4 shrink-0" />
                  Faltan campos requeridos: Nombre y Precio (*)
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-yellow-700">¿Formato no estándar?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAI}
                    disabled={aiLoading || aiUsage.used >= aiUsage.limit}
                    className="border-primary/30 hover:bg-primary/5"
                  >
                    {aiLoading ? (
                      <>
                        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {aiUsage.used}/{aiUsage.limit} usos hoy
                  </span>
                </div>
              </div>
            )}

            {allRequiredMapped && (
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  <ChevronLeft className="size-4 mr-1" />
                  Volver
                </Button>
                <Button onClick={handleImport} disabled={loading}>
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
              </div>
            )}

            {!allRequiredMapped && (
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  <ChevronLeft className="size-4 mr-1" />
                  Volver
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2b: AI Confirm */}
      {step === "ai-confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Resultado del análisis con IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La IA extrajo <strong>{aiProducts.length}</strong> productos de tu archivo.
              Revisa la lista y confirma para importar.
            </p>

            {aiErrors.length > 0 && (
              <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-700 mb-1">Avisos:</p>
                {aiErrors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-yellow-600 text-xs">{e}</div>
                ))}
                {aiErrors.length > 10 && <div className="text-yellow-600 text-xs">...y {aiErrors.length - 10} más</div>}
              </div>
            )}

            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-right">Precio</th>
                    <th className="p-2 text-right">Costo</th>
                    <th className="p-2 text-right">Stock</th>
                    <th className="p-2 text-left">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {aiProducts.map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-right">${p.price.toFixed(2)}</td>
                      <td className="p-2 text-right">{p.costPrice != null ? `$${p.costPrice.toFixed(2)}` : "—"}</td>
                      <td className="p-2 text-right">{p.stock}</td>
                      <td className="p-2">
                        {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ChevronLeft className="size-4 mr-1" />
                Volver al mapeo manual
              </Button>
              <Button onClick={handleAIConfirm} disabled={loading || aiProducts.length === 0}>
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
          </CardContent>
        </Card>
      )}

      {/* Step 3: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <AlertCircle className="size-5 text-yellow-500" />
              )}
              Importación completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="text-3xl font-bold text-green-500">{result.created}</div>
                <div className="text-sm text-muted-foreground">Creados</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-3xl font-bold text-yellow-500">{result.skipped}</div>
                <div className="text-sm text-muted-foreground">Omitidos</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-3xl font-bold text-red-500">{result.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errores</div>
              </div>
            </div>

            {result.categoriesCreated > 0 && (
              <div className="text-sm text-center text-muted-foreground">
                {result.categoriesCreated} categorías creadas automáticamente
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Errores:</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-sm text-destructive p-2 bg-destructive/10 rounded">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
                Ver productos
              </Button>
              <Button onClick={() => { setStep("upload"); setFile(null); setResult(null); setAiProducts([]) }}>
                Importar otro archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
