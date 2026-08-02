import Link from "next/link"
import { Check, Crown, Sparkles, Store } from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FEATURES, PLANS } from "@/lib/features"
import type { FeatureKey, PlanSlug } from "@/lib/features"

export const metadata = {
  title: "Planes — Panitas Negocios",
  description:
    "Panitas Negocios y Panitas Negocios Plus: inventario, POS, CRM, tienda online, reportes, asistente IA y centro de chats para emprendedores.",
}

function groupedFeatures(keys: FeatureKey[]) {
  const groups: Array<{ label: string; keys: FeatureKey[] }> = [
    { label: "Operación del negocio", keys: keys.filter((k) => FEATURES[k].group === "core") },
    { label: "Comunicación con clientes", keys: keys.filter((k) => FEATURES[k].group === "communication") },
    { label: "IA comercial", keys: keys.filter((k) => FEATURES[k].group === "ai") },
  ]
  return groups.filter((g) => g.keys.length > 0)
}

export default async function PlanesPage() {
  const session = await auth()
  const userId = session?.user?.id

  const ownedStore = userId
    ? await prisma.store.findUnique({ where: { userId }, select: { id: true } }).catch(() => null)
    : null

  const primaryHref = !userId ? "/register" : ownedStore ? "/dashboard" : "/choose-plan"
  const primaryLabel = !userId ? "Crear cuenta gratis" : ownedStore ? "Ir a mi dashboard" : "Elegir plan"

  const plans: PlanSlug[] = ["business", "business_plus"]

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold text-[#050505]">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <img src="/favicon.png" alt="Panitas" className="size-5 object-contain" />
            </span>
            PANITAS
          </Link>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard">
                <Button size="sm" className="rounded-xl bg-primary text-accent font-bold text-xs">
                  Ir al Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-[#050505]/80 hover:bg-gray-50">
                    Iniciar sesión
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="rounded-xl bg-primary text-accent font-bold text-xs">
                    Prueba gratis
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-6 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute -left-40 top-0 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-40 size-[400px] rounded-full bg-brand/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <Badge variant="outline" className="mb-4 gap-1.5 border-brand/40 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            <Sparkles className="size-3.5" />
            Panitas Negocios 2.0
          </Badge>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[#050505] sm:text-5xl">
            El plan perfecto para tu <span className="text-primary">negocio</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#6B7280]">
            Dos planes, una plataforma. Elige el que necesitas hoy y escala cuando tu negocio lo pida.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((slug) => {
            const plan = PLANS[slug]
            const groups = groupedFeatures(plan.features)
            const isPlus = slug === "business_plus"
            const PlanIcon = isPlus ? Crown : Store

            return (
              <div
                key={slug}
                className={`relative flex flex-col rounded-3xl p-6 shadow-sm transition-all hover:shadow-md ${
                  isPlus
                    ? "border-2 border-brand bg-gradient-to-b from-brand/5 to-white"
                    : "glass-dark"
                }`}
              >
                {isPlus && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand px-4 py-1 text-[10px] font-extrabold text-black shadow-lg shadow-brand/20">
                      Lo más completo
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-11 items-center justify-center rounded-xl ${
                      isPlus ? "bg-brand text-black" : "bg-primary text-accent"
                    }`}
                  >
                    <PlanIcon className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-[#050505]">{plan.displayName}</h2>
                    <p className="text-xs text-[#6B7280]">{plan.tagline}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">{plan.description}</p>

                <div className="mt-6 flex-1 space-y-5">
                  {groups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]/70">
                        {group.label}
                      </p>
                      <ul className="space-y-2">
                        {group.keys.map((key) => (
                          <li key={key} className="flex items-start gap-2 text-sm text-[#050505]/80">
                            <Check className={`mt-0.5 size-4 shrink-0 ${isPlus ? "text-brand" : "text-emerald-500"}`} />
                            <span>
                              <span className="font-semibold">{FEATURES[key].name}</span>
                              <span className="text-[#6B7280]"> — {FEATURES[key].description}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link href={primaryHref} className="block">
                    <Button
                      size="lg"
                      className={`w-full h-11 rounded-xl text-xs font-bold ${
                        isPlus
                          ? "bg-brand text-black hover:brightness-105 shadow-lg shadow-brand/20"
                          : "bg-primary text-accent hover:brightness-105"
                      }`}
                    >
                      {primaryLabel}
                    </Button>
                  </Link>
                  <Link href="/pricing" className="mt-2 block">
                    <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs font-bold text-[#6B7280] hover:bg-gray-50">
                      Ver precios actuales
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B7280]/70">
          Sin comisiones por venta. Cambia de plan cuando quieras. Tasa BCV del día en todos los planes.
        </p>
      </section>

      <footer className="bg-[#071A33] px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-xs text-white/50">
          <p className="mb-2">Hecho en Venezuela con ❤️ para todos los emprendedores.</p>
          <div className="flex justify-center gap-6">
            {["Términos", "Privacidad", "Contacto", "FAQ"].map((link) => {
              const href =
                link === "Términos"
                  ? "/terminos"
                  : link === "Privacidad"
                    ? "/privacidad"
                    : link === "FAQ"
                      ? "/faq"
                      : "/contacto"
              return (
                <Link key={link} href={href} className="text-white/50 transition-colors hover:text-white">
                  {link}
                </Link>
              )
            })}
          </div>
        </div>
      </footer>
    </div>
  )
}
