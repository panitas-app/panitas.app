"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Store as StoreIcon, MapPin, MessageCircle, Globe, Sparkles, Plus } from "lucide-react"
import type { Store } from "@prisma/client"
import { AiBusinessImprove } from "@/components/dashboard/ai-business-improve"
import { TemplateSelector } from "@/components/dashboard/template-selector"

interface SocialEntry {
  network: string
  url: string
}

const SOCIAL_NETWORKS = [
  { value: "instagram", label: "Instagram", icon: "instagram" },
  { value: "tiktok", label: "TikTok", icon: "tiktok" },
  { value: "facebook", label: "Facebook", icon: "facebook" },
  { value: "youtube", label: "YouTube", icon: "youtube" },
  { value: "twitter", label: "X (Twitter)", icon: "twitter" },
]

interface Props {
  store: Store
  planType: string
  storeId: string
}

export function EditProfileForm({ store, planType, storeId }: Props) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const isAgenda = planType === "agenda" || planType === "reservas"
  const title = isAgenda ? "Editar perfil" : "Editar tienda"

  const [name, setName] = useState(store.name)
  const [slug, setSlug] = useState(store.slug)
  const [description, setDescription] = useState(store.description || "")
  const [logo, setLogo] = useState(store.logo || "")
  const [banner, setBanner] = useState(store.banner || "")
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor || "#2563eb")
  const [domain, setDomain] = useState(store.domain || "")
  const [phone, setPhone] = useState(store.phone || "")
  const [whatsapp, setWhatsapp] = useState(store.whatsapp || "")
  const [address, setAddress] = useState(store.address || "")

  const [socials, setSocials] = useState<SocialEntry[]>(() => {
    const entries: SocialEntry[] = []
    for (const n of SOCIAL_NETWORKS) {
      const val = (store as any)[n.value]
      if (val) entries.push({ network: n.value, url: val })
    }
    return entries
  })

  const [newNetwork, setNewNetwork] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [showAddSocial, setShowAddSocial] = useState(false)

  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [saving, setSaving] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File, type: "logo" | "banner") => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingBanner
    const onSuccess = type === "logo" ? setLogo : setBanner
    setter(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onSuccess(data.url)
      toast.success(`${type === "logo" ? "Logo" : "Banner"} subido`)
    } catch {
      toast.error(`Error al subir ${type === "logo" ? "logo" : "banner"}`)
    } finally {
      setter(false)
    }
  }, [])

  const handleAddSocial = () => {
    if (!newNetwork || !newUrl.trim()) return
    const existing = socials.find(s => s.network === newNetwork)
    if (existing) {
      setSocials(prev => prev.map(s => s.network === newNetwork ? { ...s, url: newUrl.trim() } : s))
    } else {
      setSocials(prev => [...prev, { network: newNetwork, url: newUrl.trim() }])
    }
    setNewNetwork("")
    setNewUrl("")
    setShowAddSocial(false)
  }

  const handleRemoveSocial = (network: string) => {
    setSocials(prev => prev.filter(s => s.network !== network))
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    const body: Record<string, any> = {
      name: name || undefined,
      slug: slug || undefined,
      description: description || null,
      logo: logo || null,
      banner: banner || null,
      primaryColor: primaryColor || "#2563eb",
      domain: domain || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
    }
    for (const n of SOCIAL_NETWORKS) {
      const entry = socials.find(s => s.network === n.value)
      body[n.value] = entry ? entry.url : null
    }
    try {
      const res = await fetch("/api/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al guardar")
      }
      toast.success(title === "Editar perfil" ? "Perfil guardado" : "Tienda guardada")
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }, [name, slug, description, logo, banner, primaryColor, domain, phone, whatsapp, address, socials, title, router])

  const availableNetworks = SOCIAL_NETWORKS.filter(n => !socials.find(s => s.network === n.value))

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Form */}
      <div className="flex-1 space-y-8 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Personaliza la apariencia de tu {isAgenda ? "perfil público" : "tienda"}.</p>
        </div>

        {/* Información */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Información</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl px-3 border border-border">
              <span className="shrink-0 text-xs">panitas.app/store/</span>
              <input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                className="flex-1 bg-transparent py-2 outline-none text-foreground font-medium"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <div className="flex justify-end -mt-6 mb-1">
              <AiBusinessImprove
                businessName={name}
                currentDescription={description}
                currentColors={primaryColor}
                onApply={(data) => {
                  if (data.improvedDescription) setDescription(data.improvedDescription)
                }}
              />
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>
        </section>

        {/* Imágenes */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Imágenes</h2>
          <div className="space-y-2">
            <Label>Logo</Label>
            <input
              type="file" accept="image/*" className="hidden" ref={logoInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "logo") }}
              disabled={uploadingLogo}
            />
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl bg-muted border border-border overflow-hidden">
                {logo ? (
                  <img src={logo} alt="Logo" className="size-full object-cover" />
                ) : (
                  <StoreIcon className="size-5 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo} className="rounded-lg text-xs h-8">
                    {uploadingLogo ? "Subiendo..." : logo ? "Cambiar" : "Subir"}
                  </Button>
                  {logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogo("")} className="rounded-lg text-xs h-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                      Eliminar
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">512x512px recomendado. Maximo 5 MB.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Banner</Label>
            <input
              type="file" accept="image/*" className="hidden" ref={bannerInputRef}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "banner") }}
              disabled={uploadingBanner}
            />
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {banner && (
                <div className="relative h-28 w-full bg-muted">
                  <img src={banner} alt="Banner" className="size-full object-cover" />
                  <button type="button" onClick={() => setBanner("")} className="absolute top-2 right-2 size-6 rounded-full bg-black/50 hover:bg-red-500 text-white flex items-center justify-center cursor-pointer transition-colors">
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3 p-4">
                <Button type="button" variant="outline" size="sm" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner} className="rounded-lg text-xs h-8">
                  {uploadingBanner ? "Subiendo..." : banner ? "Cambiar" : "Subir"}
                </Button>
                <p className="text-[10px] text-muted-foreground">Formato horizontal recomendado. Maximo 5 MB.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Marca */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Marca</h2>
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color principal</Label>
            <div className="flex gap-2">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-9 p-0.5 rounded-lg cursor-pointer border border-border bg-transparent"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 rounded-xl font-mono text-xs"
                placeholder="#2563eb"
              />
            </div>
          </div>
        </section>

        {/* Dominio personalizado */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dominio personalizado</h2>
          <div className="space-y-2">
            <Label htmlFor="domain">Dominio</Label>
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="tienda.midominio.com" className="rounded-xl" />
          </div>
        </section>

        {/* Redes Sociales */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Redes Sociales</h2>
          {socials.map((s) => {
            const net = SOCIAL_NETWORKS.find(n => n.value === s.network)
            return (
              <div key={s.network} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground min-w-[80px]">{net?.label || s.network}</span>
                <input
                  value={s.url}
                  onChange={(e) => setSocials(prev => prev.map(x => x.network === s.network ? { ...x, url: e.target.value } : x))}
                  placeholder="https://..."
                  className="flex-1 bg-transparent py-2 outline-none text-sm text-foreground placeholder:text-muted-foreground/50"
                />
                <button type="button" onClick={() => handleRemoveSocial(s.network)} className="text-muted-foreground/50 hover:text-red-500 cursor-pointer">
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
          {showAddSocial ? (
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Red</Label>
                <Select value={newNetwork} onValueChange={(val) => val && setNewNetwork(val)}>
                  <SelectTrigger className="rounded-lg h-9">
                    <SelectValue placeholder="Seleccionar red" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableNetworks.map((n) => (
                      <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Enlace</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-lg h-9"
                />
              </div>
              <Button type="button" size="sm" onClick={handleAddSocial} disabled={!newNetwork || !newUrl.trim()} className="rounded-lg h-9">
                Agregar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddSocial(false); setNewNetwork(""); setNewUrl("") }} className="rounded-lg h-9">
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSocial(true)} disabled={availableNetworks.length === 0} className="rounded-lg text-xs h-9">
              <Plus className="size-4 mr-1" />
              Agregar red social
            </Button>
          )}
        </section>

        {/* Contacto */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Contacto</h2>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" placeholder="+58 412 123 4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-xl" placeholder="+584121234567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" placeholder="Caracas, Venezuela" />
          </div>
        </section>

        {/* Plantilla */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Plantilla de tienda</h2>
          <p className="text-xs text-muted-foreground">Elige el diseno visual de tu tienda publica</p>
          <TemplateSelector storeId={storeId} currentTemplate={store.template || "modern"} />
        </section>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={saving || uploadingLogo || uploadingBanner} className="rounded-xl px-6 h-10">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")} className="rounded-xl px-6 h-10">
            Cancelar
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="w-full lg:w-[360px] shrink-0">
        <div className="sticky top-8">
          <p className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wider">Vista previa</p>
          <div className={`rounded-2xl border border-border overflow-hidden shadow-sm ${isDark ? "bg-gray-950" : "bg-white"}`}>
            <div className={`mx-auto max-w-full ${isDark ? "bg-gray-950" : "bg-white"}`}>
              <div className={`h-20 sm:h-28 relative overflow-hidden ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
                {banner && <img src={banner} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="px-4 -mt-8 relative z-10 pb-4">
                <div className="size-16 rounded-full p-0.5 shadow-md mx-auto" style={{ backgroundColor: isDark ? "#1f2937" : "white" }}>
                  <div className={`size-full rounded-full overflow-hidden ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    {logo ? (
                      <img src={logo} alt={name} className="size-full object-cover" />
                    ) : (
                      <div className={`size-full flex items-center justify-center ${isDark ? "bg-gradient-to-br from-gray-700 to-gray-800" : "bg-gradient-to-br from-gray-100 to-gray-200"}`}>
                        <StoreIcon className={`size-6 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-2">
                  <h3 className={`text-sm font-bold truncate ${isDark ? "text-gray-100" : "text-gray-900"}`}>{name || "Nombre de la tienda"}</h3>
                  {description && <p className={`text-[10px] mt-0.5 line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{description}</p>}
                  <div className={`flex items-center justify-center gap-3 mt-1.5 text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {address && (
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{address}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    className="w-full rounded-lg py-2 text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isAgenda ? "Reservar cita" : "Ver tienda"}
                  </button>
                </div>
                {socials.length > 0 && (
                  <div className={`flex items-center justify-center gap-3 mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {socials.map((s) => (
                      <a
                        key={s.network}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-70 transition-opacity"
                        title={SOCIAL_NETWORKS.find(n => n.value === s.network)?.label || s.network}
                      >
                        <Globe className="size-4 icon-hover-spin" />
                      </a>
                    ))}
                  </div>
                )}
                {isAgenda && (phone || whatsapp) && (
                  <div className={`flex items-center justify-center gap-2 mt-2 text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {phone && <span><MessageCircle className="size-3 inline mr-0.5" />{phone}</span>}
                  </div>
                )}
                <p className={`text-center text-[8px] mt-3 ${isDark ? "text-gray-700" : "text-gray-300"}`}>Powered by Panitas</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">La vista previa se adapta al modo oscuro si lo tienes activado.</p>
        </div>
      </div>
    </div>
  )
}
