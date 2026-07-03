"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import {
  Check,
  X,
  ArrowLeft,
  Crown,
  Sparkles,
  Shield,
  MessageCircle,
  Globe,
  TrendingUp,
  Users,
  QrCode,
  Zap,
  ShoppingCart,
  Calendar,
  Layers,
  Phone,
  BarChart3,
  Store,
  Building2,
} from "lucide-react"
import { PLAN_DEFINITIONS } from "@/lib/plans"

const planDefs = Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  catalog: Globe,
  products: ShoppingCart,
  orders: ShoppingCart,
  payments: QrCode,
  appointments: Calendar,
  crm: Users,
  automations: Zap,
  reports: BarChart3,
  whatsapp: MessageCircle,
  multiuser: Users,
}

const moduleLabels: Record<string, string> = {
  catalog: "Catálogo público",
  products: "Gestión de productos",
  orders: "Pedidos y ventas",
  payments: "Métodos de pago",
  appointments: "Agenda de citas",
  crm: "CRM completo",
  automations: "Automatizaciones",
  reports: "Reportes avanzados",
  whatsapp: "WhatsApp integrado",
  multiuser: "Multi-usuario",
}

const allModules = ["products", "orders", "payments", "appointments", "whatsapp", "crm", "automations", "reports", "multiuser"]

const emprendedorModules = {
  tienda: ["products", "orders", "payments", "whatsapp"],
  agenda: ["appointments", "whatsapp"],
}

const faqs = [
  { q: "¿Necesito tener conocimientos técnicos?", a: "No. Panitas está diseñado para que cualquier emprendedor pueda gestionar su negocio sin escribir código." },
  { q: "¿Cómo recibo el dinero de las ventas?", a: "El dinero va directamente a tus cuentas bancarias. Panitas no intermedia ni retiene tus fondos." },
  { q: "¿Hay comisiones por venta?", a: "No cobramos comisiones. Todo lo que vendas es 100% tuyo. Solo pagas la suscripción mensual o anual." },
  { q: "¿Puedo cambiar de plan?", a: "Sí, puedes actualizar o cancelar tu plan en cualquier momento desde configuración." },
  { q: "¿Puedo tener tienda y agenda?", a: "Sí, los planes Negocio y Empresarial incluyen ambos módulos integrados." },
  { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos transferencia bancaria, Pago Móvil, Zelle y próximamente tarjetas internacionales." },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [emprendedorMode, setEmprendedorMode] = useState<"tienda" | "agenda">("tienda")

  const popularPlan = "negocio"

  const planColors: Record<string, string> = {
    basico: "from-amber-500 to-amber-700",
    negocio: "from-primary to-blue-600",
    empresarial: "from-slate-700 to-slate-900",
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <img src="/favicon.jpg" alt="Panitas" className="size-5 object-contain" />
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
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold">Iniciar sesión</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="rounded-xl bg-primary text-accent font-bold text-xs">Registrarse gratis</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 text-center">
        <div className="pointer-events-none absolute -left-40 top-0 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-40 size-[400px] rounded-full bg-amber-200/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="mr-1.5 size-3.5" />
            Sin comisiones por venta
          </Badge>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-accent sm:text-5xl lg:text-6xl">
            El plan perfecto para tu <span className="text-primary">negocio</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 dark:text-slate-400">
            Tienda online, agenda de citas, CRM y automatizaciones en una sola plataforma. Elige el plan que necesitas y activa solo lo que usas.
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <button onClick={() => setBillingCycle("monthly")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-accent text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
          Mensual
        </button>
        <button onClick={() => setBillingCycle("yearly")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-accent text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>
          Anual
          <Badge className="bg-primary text-[9px] text-accent px-2 py-0.5 font-bold">Ahorra 20%</Badge>
        </button>
      </div>

      {/* Pricing cards */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Plan Emprendedor */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="relative flex flex-col rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700`}>
              <Store className="size-5 text-white" />
            </div>
            <h3 className="font-heading text-lg font-bold text-accent">Plan Emprendedor</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {emprendedorMode === "tienda"
                ? "Tu tienda online lista para vender."
                : "Sistema de reservas para tu negocio."}
            </p>

            {/* Toggle switch */}
            <div className="mb-5 flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setEmprendedorMode("tienda")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  emprendedorMode === "tienda" ? "bg-white dark:bg-slate-900 text-accent shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-accent"
                }`}
              >
                <Store className="mr-1.5 inline size-3.5" />
                Emprendedor
              </button>
              <button
                onClick={() => setEmprendedorMode("agenda")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  emprendedorMode === "agenda" ? "bg-white dark:bg-slate-900 text-accent shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-accent"
                }`}
              >
                <Calendar className="mr-1.5 inline size-3.5" />
                Reservas
              </button>
            </div>

            <div className="mb-5">
              <span className="text-3xl font-black text-accent">
                ${billingCycle === "monthly" ? 15 : (150 / 12).toFixed(0)}
              </span>
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-1">/mes</span>
              {billingCycle === "yearly" && (
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 line-through">$15/mes</span>
              )}
            </div>

            <ul className="mb-6 flex-1 space-y-2">
              {emprendedorModules[emprendedorMode].map((m) => (
                <li key={m} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {moduleLabels[m] || m}
                </li>
              ))}
            </ul>

            <Link href={session ? `/subscribe?plan=basico&period=${billingCycle}&modalidad=${emprendedorMode}` : "/register"}>
              <Button
                size="lg"
                className="w-full h-11 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent/90"
              >
                Elegir plan
              </Button>
            </Link>
          </motion.div>

          {/* Card 2: Plan Negocio */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="relative flex flex-col rounded-3xl border-2 border-primary bg-white dark:bg-slate-900 p-6 shadow-xl shadow-primary/5 scale-[1.03] transition-all hover:shadow-md"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-accent font-bold text-[10px] px-4 py-1 shadow-lg shadow-primary/20">Más Elegido</Badge>
            </div>
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600">
              <Building2 className="size-5 text-white" />
            </div>
            <h3 className="font-heading text-lg font-bold text-accent">Plan Negocio</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Tienda Y Agenda en una misma cuenta. Cambia entre módulos libremente.</p>
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-1.5">
              <Store className="size-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">Tienda</span>
              <span className="text-[11px] text-slate-300 dark:text-slate-600">+</span>
              <Calendar className="size-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">Agenda</span>
            </div>
            <div className="mb-5">
              <span className="text-3xl font-black text-accent">
                ${billingCycle === "monthly" ? 25 : (250 / 12).toFixed(0)}
              </span>
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-1">/mes</span>
              {billingCycle === "yearly" && (
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 line-through">$25/mes</span>
              )}
            </div>
            <ul className="mb-6 flex-1 space-y-2">
              {planDefs.find((p) => p.id === "negocio")?.modules.map((m) => (
                <li key={m} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {moduleLabels[m] || m}
                </li>
              ))}
            </ul>
            <Link href={session ? `/subscribe?plan=negocio&period=${billingCycle}` : "/register"}>
              <Button
                size="lg"
                className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-accent hover:brightness-105 shadow-lg shadow-primary/20"
              >
                Elegir plan
              </Button>
            </Link>
          </motion.div>

          {/* Card 3: Plan Empresarial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="relative flex flex-col rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900">
              <Crown className="size-5 text-amber-400" />
            </div>
            <h3 className="font-heading text-lg font-bold text-accent">Plan Empresarial</h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Sistema B2B para mayoristas con clientes, precios por volumen y cotizaciones.</p>
            <div className="mb-5">
              <span className="text-3xl font-black text-accent">
                ${billingCycle === "monthly" ? 35 : (350 / 12).toFixed(0)}
              </span>
              <span className="text-sm text-slate-400 dark:text-slate-500 ml-1">/mes</span>
              {billingCycle === "yearly" && (
                <span className="ml-2 text-xs text-slate-400 dark:text-slate-500 line-through">$35/mes</span>
              )}
            </div>
            <ul className="mb-6 flex-1 space-y-2">
              {planDefs.find((p) => p.id === "empresarial")?.modules.map((m) => (
                <li key={m} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {moduleLabels[m] || m}
                </li>
              ))}
            </ul>
            <Link href={session ? `/subscribe?plan=empresarial&period=${billingCycle}` : "/register"}>
              <Button
                size="lg"
                className="w-full h-11 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent/90"
              >
                Elegir plan
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center font-heading text-3xl font-extrabold text-accent sm:text-4xl">Comparativa de planes</h2>
        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="px-5 py-4 text-left font-bold text-accent">Módulo</th>
                <th className="px-5 py-4 text-center font-bold">Emprendedor</th>
                <th className="px-5 py-4 text-center font-bold">Negocio</th>
                <th className="px-5 py-4 text-center font-bold">Empresarial</th>
              </tr>
            </thead>
            <tbody>
              {allModules.map((mod, i) => (
                <tr key={mod} className={`border-b border-slate-50 dark:border-slate-800 ${i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/30 dark:bg-slate-900/30"}`}>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{moduleLabels[mod]}</td>
                  <td className="px-5 py-3 text-center">
                    {emprendedorModules.tienda.includes(mod) || emprendedorModules.agenda.includes(mod) ? (
                      <Check className="mx-auto size-4 text-emerald-500" />
                    ) : (
                      <X className="mx-auto size-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {planDefs.find((p) => p.id === "negocio")?.modules.includes(mod as any) ? (
                      <Check className="mx-auto size-4 text-emerald-500" />
                    ) : (
                      <X className="mx-auto size-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {planDefs.find((p) => p.id === "empresarial")?.modules.includes(mod as any) ? (
                      <Check className="mx-auto size-4 text-emerald-500" />
                    ) : (
                      <X className="mx-auto size-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80">
                <td className="px-5 py-3 font-semibold text-accent">Productos</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">Ilimitados</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">Ilimitados</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">Ilimitados</td>
              </tr>
              <tr className="bg-slate-50/80 dark:bg-slate-900/80">
                <td className="px-5 py-3 font-semibold text-accent">Miembros del equipo</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">1</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">5</td>
                <td className="px-5 py-3 text-center text-sm text-slate-600 dark:text-slate-300">10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <h2 className="mb-10 text-center font-heading text-3xl font-extrabold text-accent sm:text-4xl">Preguntas Frecuentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all">
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="flex w-full items-center justify-between px-6 py-5 text-left font-bold text-accent transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                <span className="text-sm">{faq.q}</span>
                <motion.span animate={{ rotate: openFaq === idx ? 180 : 0 }} className="text-slate-400 dark:text-slate-500 shrink-0 ml-4">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#102A43] to-[#102A43]/95 py-20">
        <div className="pointer-events-none absolute -left-40 top-0 size-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">Comienza hoy, es gratis</h2>
          <p className="mt-4 text-slate-300">Crea tu tienda o agenda en minutos. Sin tarjeta de crédito. Sin compromisos.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={session ? "/subscribe" : "/register"}>
              <Button size="lg" className="h-13 rounded-xl bg-primary text-accent font-bold px-8 text-base shadow-xl shadow-primary/30 hover:brightness-105">
                {session ? "Adquirir un plan" : "Crear cuenta gratis"}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400">Tasa BCV del día garantizada en todos los planes. Sin comisiones por venta.</p>
        </div>
      </section>

      <footer className="bg-[#102A43] border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-7xl text-center text-xs text-slate-400">
          <p className="mb-2">Hecho en Venezuela con ❤️ para todos los emprendedores.</p>
          <div className="flex justify-center gap-6">
            {["Términos", "Privacidad", "Contacto", "FAQ"].map((link) => {
              const href = link === "Términos" ? "/terminos" : link === "Privacidad" ? "/privacidad" : link === "FAQ" ? "/faq" : link === "Contacto" ? "/contacto" : "/"
              return (
                <Link key={link} href={href} className="hover:text-white transition-colors">{link}</Link>
              )
            })}
          </div>
        </div>
      </footer>
    </div>
  )
}
