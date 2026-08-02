"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Store, CalendarClock, Package, Upload, Rocket, LayoutDashboard, ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"

const STEPS = [
  { label: "Tipo de negocio", description: "¿Qué vendes?" },
  { label: "Información", description: "Cuéntanos más" },
  { label: "Activación", description: "Empieza rápido" },
]

const CATEGORIES = [
  "Alimentos y bebidas",
  "Ropa y calzado",
  "Electrónica y accesorios",
  "Belleza y cuidado personal",
  "Hogar y decoración",
  "Ferretería y herramientas",
  "Salud y farmacia",
  "Otros",
]

const COUNTRIES = [
  { value: "VE", label: "🇻🇪 Venezuela" },
  { value: "CO", label: "🇨🇴 Colombia" },
  { value: "MX", label: "🇲🇽 México" },
  { value: "PA", label: "🇵🇦 Panamá" },
  { value: "EC", label: "🇪🇨 Ecuador" },
  { value: "PE", label: "🇵🇪 Perú" },
  { value: "CR", label: "🇨🇷 Costa Rica" },
  { value: "DO", label: "🇩🇴 República Dominicana" },
  { value: "US", label: "🇺🇸 Estados Unidos" },
  { value: "ES", label: "🇪🇸 España" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "CL", label: "🇨🇱 Chile" },
  { value: "GT", label: "🇬🇹 Guatemala" },
  { value: "HN", label: "🇭🇳 Honduras" },
  { value: "SV", label: "🇸🇻 El Salvador" },
  { value: "NI", label: "🇳🇮 Nicaragua" },
  { value: "BZ", label: "🇧🇿 Belice" },
]

const CURRENCIES = [
  { value: "USD", label: "$ USD — Dólar" },
  { value: "VED", label: "Bs — Bolívares" },
  { value: "COP", label: "$ COP — Peso colombiano" },
  { value: "MXN", label: "$ MXN — Peso mexicano" },
  { value: "EUR", label: "€ EUR — Euro" },
]

const PRODUCT_TYPES = [
  { value: "tienda", label: "Vendo productos en tienda", description: "Físicamente y en línea" },
  { value: "mayorista", label: "Vendo a mayorista / distribuyo", description: "Ventas por volumen" },
  { value: "ambos", label: "Ambos", description: "Al detal y por mayor" },
]

const INVENTORY_STATE = [
  { value: "yes", label: "Sí, ya tengo inventario", description: "Lo importaré o registraré" },
  { value: "no", label: "No, empezaré de cero", description: "Crearé mis productos poco a poco" },
]

interface ActivationOption {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const ACTIVATION_OPTIONS: ActivationOption[] = [
  { id: "importar", title: "Importar inventario", description: "Sube tu catálogo desde Excel o CSV", icon: Upload },
  { id: "crear", title: "Crear mis productos", description: "Registra tus productos uno a uno", icon: Package },
  { id: "tienda", title: "Publicar mi tienda", description: "Activa tu tienda en línea con tu marca", icon: Rocket },
  { id: "explorar", title: "Explorar el dashboard", description: "Conocer la plataforma antes de cargar datos", icon: LayoutDashboard },
]

interface OnboardingIntent {
  businessType: "products" | "services"
  name: string
  category: string
  country: string
  currency: string
  productType: string
  productCount: string
  hasInventory: string
  activation: string
}

const DEFAULT_INTENT: OnboardingIntent = {
  businessType: "products",
  name: "",
  category: "",
  country: "VE",
  currency: "USD",
  productType: "",
  productCount: "",
  hasInventory: "",
  activation: "",
}

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [intent, setIntent] = useState<OnboardingIntent>(DEFAULT_INTENT)

  function update<K extends keyof OnboardingIntent>(key: K, value: OnboardingIntent[K]) {
    setIntent((prev) => ({ ...prev, [key]: value }))
  }

  function canContinue(): boolean {
    if (step === 1) return true
    if (step === 2) return intent.name.trim().length > 0 && intent.category.length > 0
    return intent.activation.length > 0
  }

  function handleContinue() {
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2) {
      setStep(3)
      return
    }
    // Paso 3 — persiste la intención y continúa al flujo de plan existente
    try {
      localStorage.setItem("panitas:onboarding:intent", JSON.stringify(intent))
    } catch {}
    router.push("/choose-plan")
  }

  function handleBack() {
    if (step === 1) {
      router.push("/")
      return
    }
    setStep(step - 1)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <header className="flex items-center justify-between px-5 pt-5 sm:px-8">
        <span className="font-heading text-xl font-bold tracking-tight text-primary">
          Panitas <span className="text-foreground">Negocios</span>
        </span>
        <button
          onClick={() => router.push("/choose-plan")}
          className="text-xs font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Omitir
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
        <Stepper steps={STEPS} currentStep={step} className="mb-10" />

        {step === 1 && (
          <div className="animate-fade-up">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                ¿Qué tipo de negocio tienes?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Elegimos las herramientas ideales para tu negocio.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => update("businessType", "products")}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-2xl border bg-card/80 p-6 text-left transition-all hover:shadow-md",
                  intent.businessType === "products"
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="size-5" />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-foreground">
                    Tienda que vende productos
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Minoristas, bodegones, ropa, calzado, abastos, farmacias y más.
                  </p>
                </div>
                {intent.businessType === "products" && (
                  <span className="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled
                className="relative flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-left opacity-70"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-foreground">
                    Servicios por cita
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Barberías, estética, clínicas y consultorios.
                  </p>
                </div>
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-brand">
                  <Sparkles className="size-3" /> Próximamente
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                Cuéntanos sobre tu negocio
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Puedes ajustar esto más adelante desde la configuración.
              </p>
            </div>

            <div className="space-y-5 rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">
                    Nombre del negocio <span className="text-destructive">*</span>
                  </span>
                  <Input
                    value={intent.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ej: Bodegón La Esquina"
                    maxLength={60}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">
                    Categoría <span className="text-destructive">*</span>
                  </span>
                  <select
                    value={intent.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="w-full"
                  >
                    <option value="">Selecciona una categoría</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">País</span>
                  <select
                    value={intent.country}
                    onChange={(e) => update("country", e.target.value)}
                    className="w-full"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">Moneda</span>
                  <select
                    value={intent.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    className="w-full"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-foreground">
                    Tipo de venta
                  </span>
                  <select
                    value={intent.productType}
                    onChange={(e) => update("productType", e.target.value)}
                    className="w-full"
                  >
                    <option value="">Selecciona una opción</option>
                    {PRODUCT_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="rounded-xl border border-border bg-background/50 p-4">
                <legend className="px-1 text-xs font-bold text-foreground">
                  ¿Ya tienes inventario?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INVENTORY_STATE.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("hasInventory", opt.value)}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                        intent.hasInventory === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                          intent.hasInventory === opt.value ? "border-primary bg-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {intent.hasInventory === opt.value && <Check className="size-2.5 text-primary-foreground" />}
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-foreground">{opt.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{opt.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                ¿Cómo quieres empezar?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Panitas se adapta a tu ritmo. Puedes hacer todo esto más adelante.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {ACTIVATION_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const selected = intent.activation === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("activation", opt.id)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl border bg-card/80 p-4 text-left transition-all hover:shadow-md",
                      selected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{opt.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {selected && (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={handleBack} className="gap-1.5 rounded-xl">
            <ArrowLeft className="size-4" />
            Atrás
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue()}
            className="gap-1.5 rounded-xl"
          >
            {step === 3 ? "Continuar" : "Siguiente"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
