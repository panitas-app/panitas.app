"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { AiProductButton } from "@/components/dashboard/ai-product-button"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  X,
  Bold,
  Heading3,
  Heading4,
  Link2,
  Plus,
  Trash2,
  Tag,
  BadgeDollarSign,
  ChevronDown,
  Sparkles,
  Ruler,
} from "lucide-react"
import type { Product, Category } from "@prisma/client"

interface PriceScale {
  quantity: string
  price: string
}

export function ProductForm({
  product,
  categories: initialCategories,
}: {
  product?: Product
  categories: Category[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>(() => {
    if (!product?.images) return []
    try { return JSON.parse(product.images as string) } catch { return [] }
  })
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Categories states
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(product?.categoryId || "empty")
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [savingCategory, setSavingCategory] = useState(false)

  // WYSIWYG Rich Text Editor states
  const editorRef = useRef<HTMLDivElement>(null)
  const [descriptionHtml, setDescriptionHtml] = useState(product?.description || "")
  const [charCount, setCharCount] = useState(0)
  const lastValidHtmlRef = useRef(product?.description || "")

  // Wholesale states
  const [isWholesale, setIsWholesale] = useState(product?.isWholesale || false)
  const [wholesaleLabel, setWholesaleLabel] = useState(product?.wholesaleLabel || "")
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesalePrice?.toString() || "")
  
  // Parse wholesale scales from JSON
  const initialScales: PriceScale[] = (() => {
    try {
      if (product?.wholesaleScales) {
        const parsed = (typeof product.wholesaleScales === "string" 
          ? JSON.parse(product.wholesaleScales) 
          : product.wholesaleScales) as any[]
        return parsed.map((scale) => ({
          quantity: scale.quantity?.toString() || "",
          price: scale.price?.toString() || "",
        }))
      }
    } catch (e) {
      console.error(e)
    }
    return []
  })()
  const [priceScales, setPriceScales] = useState<PriceScale[]>(initialScales)

  // Sizes states
  interface ProductSize {
    size: string
    stock: number | null
  }
  const [hasSizes, setHasSizes] = useState((product as any)?.hasSizes || false)
  const initialSizes: ProductSize[] = (() => {
    try {
      if ((product as any)?.sizes) {
        return (typeof (product as any).sizes === "string" 
          ? JSON.parse((product as any).sizes) 
          : (product as any).sizes) as ProductSize[]
      }
    } catch (e) {
      console.error(e)
    }
    return []
  })()
  const [sizes, setSizes] = useState<ProductSize[]>(initialSizes)

  function handleAddSize() {
    setSizes((prev) => [...prev, { size: "", stock: null }])
  }

  function handleUpdateSize(index: number, field: keyof ProductSize, val: any) {
    setSizes((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [field]: val } : s))
    )
  }

  function handleRemoveSize(indexToRemove: number) {
    setSizes((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // Calculate description character count (excluding HTML tags)
  useEffect(() => {
    const text = descriptionHtml.replace(/<[^>]*>/g, "")
    setCharCount(text.length)
  }, [descriptionHtml])

  // Initialize editor text
  useEffect(() => {
    if (editorRef.current && product?.description) {
      editorRef.current.innerHTML = product.description
    }
  }, [product])

  function handleEditorChange() {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      // Enforce 5000 character limit
      const text = html.replace(/<[^>]*>/g, "")
      if (text.length <= 5000) {
        setDescriptionHtml(html)
        lastValidHtmlRef.current = html
      } else {
        toast.error("Has alcanzado el límite de 5000 caracteres")
        // Restore last valid HTML
        editorRef.current.innerHTML = lastValidHtmlRef.current
        
        // Place cursor at the end
        try {
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(editorRef.current)
          range.collapse(false)
          sel?.removeAllRanges()
          sel?.addRange(range)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  function applyFormatting(command: string, value: string = "") {
    document.execCommand(command, false, value)
    handleEditorChange()
  }

  function insertLink() {
    const url = prompt("Introduce la URL para el enlace (ej: https://ejemplo.com):")
    if (url) {
      applyFormatting("createLink", url)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const uploadedUrls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        let errMsg = ""
        if (!res.ok) {
          try { const d = await res.json(); errMsg = d.error || res.statusText } catch { errMsg = res.statusText }
          throw new Error(errMsg)
        }
        const data = await res.json()
        uploadedUrls.push(data.url)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido"
        toast.error(`${file.name}: ${msg}`)
      }
    }

    setImages((prev) => [...prev, ...uploadedUrls])
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleRemoveImage(indexToRemove: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // Inline Category Creator
  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      toast.error("El nombre de la categoría es obligatorio")
      return
    }

    setSavingCategory(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })

      if (res.ok) {
        const newCat = await res.json()
        setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)))
        
        // Esperamos un tick para que la nueva categoría se monte en la lista antes de seleccionarla
        setTimeout(() => {
          setSelectedCategory(newCat.id)
        }, 50)

        setNewCategoryName("")
        setShowNewCategoryInput(false)
        toast.success(`Categoría "${newCat.name}" guardada con éxito`)
      } else {
        const errData = await res.json()
        toast.error(errData.error || "Error al crear la categoría")
      }
    } catch {
      toast.error("Error de conexión al crear categoría")
    } finally {
      setSavingCategory(false)
    }
  }

  function handleCategorySuggested(categoryName: string) {
    setNewCategoryName(categoryName)
    setShowNewCategoryInput(true)
  }

  // Wholesale scale managers
  function handleAddPriceScale() {
    setPriceScales((prev) => [...prev, { quantity: "", price: "" }])
  }

  function handleUpdateScale(index: number, field: keyof PriceScale, val: string) {
    setPriceScales((prev) =>
      prev.map((scale, idx) => (idx === index ? { ...scale, [field]: val } : scale))
    )
  }

  function handleRemoveScale(indexToRemove: number) {
    setPriceScales((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const body = {
      name: form.get("name"),
      description: descriptionHtml,
      price: form.get("price"),
      costPrice: form.get("costPrice"),
      sku: form.get("sku"),
      unidadBase: form.get("unidadBase"),
      stock: form.get("stock"),
      categoryId: selectedCategory === "empty" || !selectedCategory ? null : selectedCategory,
      isActive: form.get("isActive") === "on",
      images: images,
      isWholesale,
      wholesaleLabel: isWholesale ? wholesaleLabel : null,
      wholesalePrice: isWholesale ? wholesalePrice : null,
      wholesaleScales: isWholesale ? priceScales.map((scale) => ({
        quantity: parseInt(scale.quantity) || 0,
        price: parseFloat(scale.price) || 0,
      })) : [],
      hasSizes,
      sizes: hasSizes ? sizes : [],
    }

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products"
      const method = product ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al guardar el producto" }))
        throw new Error(err.error || "Error al guardar el producto")
      }
      toast.success(product ? "Producto actualizado" : "Producto creado")
      router.push("/dashboard/products")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex justify-center py-6">
      <div className="w-full max-w-2xl bg-white/80 p-8 rounded-3xl border border-white/60 shadow-2xl backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Nombre Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nombre*
            </Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              placeholder="Franela de manga corta."
              required
              onFocus={(e) => {
                e.target.placeholder = ""
              }}
              onBlur={(e) => {
                e.target.placeholder = "Franela de manga corta."
              }}
              className="rounded-xl border-slate-200 bg-white placeholder:opacity-50 placeholder:text-slate-400 focus-visible:ring-primary h-11"
            />
          </div>

          {/* AI Autocomplete Button */}
          <div className="flex justify-end -mt-2">
            <AiProductButton editorRef={editorRef} onCategorySuggested={handleCategorySuggested} />
          </div>

          {/* Description Word-like Rich Editor */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Descripción
              </Label>
              <span className={`text-[10px] font-bold ${charCount > 4800 ? "text-rose-500" : "text-slate-400"}`}>
                {charCount} / 5000 caracteres
              </span>
            </div>
            
            {/* WYSIWYG Editor Container */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
              {/* Word Toolbar */}
              <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 p-2 text-slate-500 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormatting("bold")}
                  className="size-8 rounded-lg hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                  title="Negrita"
                >
                  <Bold className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormatting("formatBlock", "<h3>")}
                  className="size-8 rounded-lg hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                  title="Título"
                >
                  <Heading3 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => applyFormatting("formatBlock", "<h4>")}
                  className="size-8 rounded-lg hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                  title="Subtítulo"
                >
                  <Heading4 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={insertLink}
                  className="size-8 rounded-lg hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                  title="Insertar Enlace"
                >
                  <Link2 className="size-4" />
                </Button>
              </div>

              {/* Editable Block */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorChange}
                {...{ placeholder: "Escribe la descripción de tu producto..." } as any}
                className="p-4 min-h-[140px] max-h-[300px] overflow-y-auto text-sm focus:outline-hidden prose prose-sm max-w-none text-slate-800"
                style={{ outline: "none" }}
              />
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Precio (USD) *
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="any"
                min="0"
                defaultValue={product?.price}
                placeholder="0.00"
                required
                className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Precio de costo (USD)
              </Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                step="any"
                min="0"
                defaultValue={product?.costPrice || ""}
                placeholder="0.00 (Opcional)"
                className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11"
              />
            </div>
          </div>

          {/* Inventory and Dynamic Categories Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stock / Cantidad
              </Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                defaultValue={product?.stock || 0}
                className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11"
              />
            </div>
            
            {/* Category Select + Inline creator */}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
                Categoría
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  {showNewCategoryInput ? "Ver categorías" : "+ Nueva Categoría"}
                </button>
              </Label>

              <AnimatePresence mode="wait">
                {showNewCategoryInput ? (
                  /* Inline Category Input */
                  <motion.div
                    key="category-input"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Ej. Accesorios"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11 flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={savingCategory}
                      className="rounded-xl bg-primary text-accent font-bold h-11 px-4 text-xs"
                    >
                      {savingCategory ? "Guardando..." : "Guardar"}
                    </Button>
                  </motion.div>
                ) : (
                  /* Standard Select Dropdown */
                  <motion.div
                    key="category-select"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                  >
                    {categories.length === 0 ? (
                      /* Fallback when no categories exist */
                      <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-400">
                        <span>Sin categorías registradas</span>
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryInput(true)}
                          className="font-black text-primary underline"
                        >
                          Crear ahora
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedCategory || "empty"}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white h-11 text-slate-700 px-3.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm appearance-none cursor-pointer font-medium"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "right 14px center",
                            backgroundSize: "16px"
                          }}
                        >
                          <option value="empty">Sin categoría</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SKU / Identification Section */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-extrabold text-accent uppercase tracking-wider">Identificación</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Código único de inventario</span>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sku" className="text-xs font-bold text-slate-500">
                  SKU <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </Label>
                <Input
                  id="sku"
                  name="sku"
                  defaultValue={product?.sku || ""}
                  placeholder="Ej: CALZ-DEPO-42-01"
                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11 uppercase text-sm font-bold tracking-wider"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidadBase" className="text-xs font-bold text-slate-500">
                  Unidad base <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                </Label>
                <Input
                  id="unidadBase"
                  name="unidadBase"
                  defaultValue={product?.unidadBase || "Unidad"}
                  placeholder="Ej: Unidad, Kilo, Litro"
                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11 text-sm font-bold"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Código único y unidad base para identificar el producto en inventario.
            </p>
          </div>

          {/* Premium Image Upload Area */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Imágenes del Producto
            </Label>
            
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center gap-2 bg-white"
            >
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:scale-105 group-hover:bg-white group-hover:text-primary transition-all duration-300">
                <Upload className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Haz clic para cargar imágenes</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP (Hasta 5MB por archivo)</p>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-3.5 pt-2 sm:grid-cols-5">
                {images.map((imgUrl, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-xs group">
                    <img src={imgUrl} alt={`Product Thumbnail ${index}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 size-5.5 rounded-full bg-slate-900/60 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100/80 my-1 w-full" />

          {/* Wholesale Toggle Section */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-extrabold text-accent">Venta al Mayor</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Descuentos por volumen</span>
              </div>
              <button
                type="button"
                onClick={() => setIsWholesale(!isWholesale)}
                className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  isWholesale ? "bg-primary" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isWholesale ? "translate-x-5.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {isWholesale && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden pt-2 border-t border-slate-100"
                >
                  {/* Banner descriptor */}
                  <div className="flex gap-2 bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary leading-relaxed font-semibold">
                    <Sparkles className="size-4.5 shrink-0 text-primary" />
                    <span>Activa esta opción si vendes este producto por cantidades.</span>
                  </div>

                  {/* Wholesale Pricing Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wholesaleLabel" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Etiqueta*
                      </Label>
                      <div className="relative">
                        <Tag className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="wholesaleLabel"
                          value={wholesaleLabel}
                          onChange={(e) => setWholesaleLabel(e.target.value)}
                          placeholder="A partir de 30 piezas"
                          className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11 pl-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wholesalePrice" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Precio unitario al mayor*
                      </Label>
                      <div className="relative">
                        <BadgeDollarSign className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="wholesalePrice"
                          type="number"
                          step="any"
                          min="0"
                          value={wholesalePrice}
                          onChange={(e) => setWholesalePrice(e.target.value)}
                          placeholder="$ 0.00"
                          className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-11 pl-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Price Scale Builder */}
                  <div className="space-y-3.5 pt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Escala de Precios Adicional
                      </span>
                      <button
                        type="button"
                        onClick={handleAddPriceScale}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-extrabold"
                      >
                        <Plus className="size-3" /> Agregar escala de precio
                      </button>
                    </div>

                    {/* Scale items */}
                    <AnimatePresence>
                      {priceScales.length > 0 && (
                        <div className="space-y-2 bg-white border border-slate-100 rounded-2xl p-3.5 shadow-inner">
                          {priceScales.map((scale, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="flex items-center gap-3.5"
                            >
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs text-slate-400 shrink-0">Cant:</span>
                                <Input
                                  type="text"
                                  value={scale.quantity}
                                  onChange={(e) => handleUpdateScale(index, "quantity", e.target.value)}
                                  placeholder="50"
                                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-9.5 text-xs text-center font-bold"
                                />
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs text-slate-400 shrink-0">Precio:</span>
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-xs text-slate-400">$</span>
                                  <Input
                                    type="text"
                                    value={scale.price}
                                    onChange={(e) => handleUpdateScale(index, "price", e.target.value)}
                                    placeholder="0.00"
                                    className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-9.5 pl-5.5 text-xs font-bold text-center"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveScale(index)}
                                className="size-8.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="size-3.5 text-slate-400 hover:text-red-500" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      * Activa esta opción si vendes este producto por cantidades.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sizes Toggle Section */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-accent">¿Vendes por tallas?</span>
                  <span className="inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary animate-pulse border border-primary/20">
                    Nuevo
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Activa esta opción si tu producto viene en diferentes tallas o tamaños</span>
              </div>
              <button
                type="button"
                onClick={() => setHasSizes(!hasSizes)}
                className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                  hasSizes ? "bg-primary" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    hasSizes ? "translate-x-5.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {hasSizes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden pt-2 border-t border-slate-100"
                >
                  {/* Banner descriptor */}
                  <div className="flex gap-2 bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary leading-relaxed font-semibold">
                    <Ruler className="size-4.5 shrink-0 text-primary" />
                    <span>Activa esta opción si tu producto viene en diferentes tallas o tamaños (S, M, L, 42, 44, etc.).</span>
                  </div>

                  {/* Sizes Builder */}
                  <div className="space-y-3.5 pt-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Lista de Tallas / Tamaños
                      </span>
                      <button
                        type="button"
                        onClick={handleAddSize}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-extrabold"
                      >
                        <Plus className="size-3" /> Agregar talla
                      </button>
                    </div>

                    {/* Size list items */}
                    <AnimatePresence>
                      {sizes.length > 0 && (
                        <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-3.5 shadow-inner">
                          {sizes.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="flex items-end gap-3.5"
                            >
                              {/* Talla / Tamaño */}
                              <div className="flex-1 flex flex-col gap-1.5">
                                <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Talla / Tamaño*
                                </Label>
                                <Input
                                  type="text"
                                  value={item.size}
                                  onChange={(e) => handleUpdateSize(index, "size", e.target.value)}
                                  placeholder="Ej: S, M, L, 42"
                                  required
                                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-9.5 text-xs font-bold"
                                />
                              </div>

                              {/* Stock (opcional) / Sin límite */}
                              <div className="flex-1 flex flex-col gap-1.5">
                                <Label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Stock (opcional)
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.stock === null ? "" : item.stock}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateSize(index, "stock", val === "" ? null : parseInt(val) || 0)
                                  }}
                                  placeholder="Sin límite"
                                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-primary h-9.5 text-xs font-bold"
                                />
                              </div>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveSize(index)}
                                className="size-8.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 mb-0.5"
                              >
                                <Trash2 className="size-3.5 text-slate-400 hover:text-red-500" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>

                    {sizes.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <p className="text-xs font-bold text-slate-400">No has agregado ninguna talla aún.</p>
                        <button
                          type="button"
                          onClick={handleAddSize}
                          className="mt-2 text-xs text-primary hover:underline font-extrabold"
                        >
                          + Agregar la primera talla
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Presentaciones — Plan Empresarial */}
          {product && (
            <div data-tour="presentaciones">
              <PresentacionesSection productId={product.id} />
            </div>
          )}

          {/* Active Toggle Option */}
          <div className="flex items-center gap-2 py-1 px-1">
            <Checkbox id="isActive" name="isActive" defaultChecked={product ? product.isActive : true} />
            <Label htmlFor="isActive" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
              Producto disponible para la venta
            </Label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3.5 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              disabled={loading || uploading || (isWholesale && (!wholesaleLabel.trim() || !wholesalePrice)) || (hasSizes && (sizes.length === 0 || sizes.some(s => !s.size.trim())))}
              className="rounded-xl bg-primary text-accent font-bold hover:brightness-105 h-11 px-6 shadow-md shadow-primary/10 transition-all"
            >
              {loading ? "Guardando..." : product ? "Actualizar" : "Crear Producto"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
              className="rounded-xl border-slate-200 bg-white font-bold h-11 px-5"
            >
              Cancelar
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}

function PresentacionesSection({ productId }: { productId: string }) {
  const [presentations, setPresentations] = useState<{ id: string; label: string; multiplier: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newMultiplier, setNewMultiplier] = useState("1")

  useEffect(() => {
    const loadPresentations = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/presentations`)
        if (res.ok) setPresentations(await res.json())
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    loadPresentations()
  }, [productId])

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    const mult = parseInt(newMultiplier) || 1
    if (mult < 1) return
    try {
      const res = await fetch(`/api/products/${productId}/presentations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), multiplier: mult }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const created = await res.json()
      setPresentations(prev => [...prev, created].sort((a, b) => a.multiplier - b.multiplier))
      setNewLabel("")
      setNewMultiplier("1")
      setShowForm(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al agregar presentación")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/presentations/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setPresentations(prev => prev.filter(p => p.id !== id))
    } catch {
      toast.error("Error al eliminar presentación")
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-extrabold text-accent">Presentaciones</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Unidad, Pack, Caja — multiplicadores de precio
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-extrabold"
        >
          <Plus className="size-3" /> {showForm ? "Cancelar" : "Agregar"}
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2 items-end">
          <div className="space-y-1 flex-1">
            <Label className="text-[10px] font-bold text-slate-500">Nombre</Label>
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Ej: Pack x6"
              className="rounded-xl border-slate-200 h-9 text-sm"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAdd())}
            />
          </div>
          <div className="space-y-1 w-24">
            <Label className="text-[10px] font-bold text-slate-500">Multiplicador</Label>
            <Input
              type="number"
              min="1"
              value={newMultiplier}
              onChange={e => setNewMultiplier(e.target.value)}
              className="rounded-xl border-slate-200 h-9 text-sm"
            />
          </div>
          <Button type="button" size="sm" onClick={handleAdd} className="h-9 rounded-xl">
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="h-10 bg-muted rounded-xl animate-pulse" />
      ) : presentations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Sin presentaciones. La unidad base se usa por defecto.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presentations.map(p => (
            <div key={p.id} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs dark:bg-gray-800">
              <span className="font-semibold text-accent">{p.label}</span>
              <span className="text-muted-foreground">×{p.multiplier}</span>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="ml-1 text-red-400 hover:text-red-600"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        Las presentaciones permiten vender el mismo producto en diferentes formatos (unidad, pack, caja). El precio se calcula como Precio base × Multiplicador.
      </p>
    </div>
  )
}
