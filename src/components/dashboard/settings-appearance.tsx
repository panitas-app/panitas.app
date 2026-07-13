"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import type { Store } from "@prisma/client"

export function SettingsAppearance({ store }: { store: Store }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [logo, setLogo] = useState(store.logo || "")
  const [banner, setBanner] = useState(store.banner || "")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setLogo(data.url)
      toast.success("Logo subido correctamente")
    } catch {
      toast.error("Error al subir el logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setBanner(data.url)
      toast.success("Banner subido correctamente")
    } catch {
      toast.error("Error al subir el banner")
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo: logo || null,
          banner: banner || null,
          primaryColor: form.get("primaryColor"),
          domain: form.get("domain") || null,
        }),
      })
      if (!res.ok) throw new Error("Error")
      toast.success("Apariencia guardada")
      router.refresh()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Logo Upload Row */}
      <div className="space-y-2">
        <Label className="block text-sm font-medium">Logo de la Tienda</Label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={logoInputRef}
          onChange={handleLogoUpload}
          disabled={uploadingLogo}
        />
        <div className="flex items-center gap-4 rounded-xl bg-card p-4">
          <div className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden shadow-xs">
            {logo ? (
              <img src={logo} alt="Logo Preview" className="size-full object-cover" />
            ) : (
              <Upload className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="h-8.5 rounded-lg text-xs"
              >
                {uploadingLogo ? "Subiendo..." : "Subir Logo"}
              </Button>
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogo("")}
                  className="h-8.5 rounded-lg text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
                >
                  Eliminar
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Imagen cuadrada de 512x512px recomendada</p>
          </div>
        </div>
      </div>

      {/* Banner Upload Row */}
      <div className="space-y-2">
        <Label className="block text-sm font-medium">Banner de Portada</Label>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={bannerInputRef}
          onChange={handleBannerUpload}
          disabled={uploadingBanner}
        />
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
          {banner && (
            <div className="relative h-28 w-full rounded-2xl overflow-hidden shadow-xs">
              <img src={banner} alt="Banner Preview" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setBanner("")}
                className="absolute top-2 right-2 size-6 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="h-8.5 rounded-lg text-xs"
            >
              {uploadingBanner ? "Subiendo..." : banner ? "Cambiar Banner" : "Subir Banner"}
            </Button>
            <p className="text-[10px] text-muted-foreground">Recomendado formato panorámico (horizontal)</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="primaryColor">Color primario</Label>
        <div className="flex gap-2">
          <Input id="primaryColor" name="primaryColor" type="color" defaultValue={store.primaryColor || "#FFB92E"} className="w-16 h-8 p-0.5 cursor-pointer rounded-lg" />
          <Input name="primaryColor" defaultValue={store.primaryColor || "#FFB92E"} className="flex-1 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">Dominio personalizado</Label>
        <Input id="domain" name="domain" defaultValue={store.domain || ""} placeholder="tienda.midominio.com" className="rounded-xl" />
      </div>
      <Button type="submit" disabled={loading || uploadingLogo || uploadingBanner} className="rounded-xl px-5 h-10 mt-2">
        {loading ? "Guardando..." : "Guardar Cambios"}
      </Button>
    </form>
  )
}
