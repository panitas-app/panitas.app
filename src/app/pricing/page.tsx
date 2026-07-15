"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import posthog from "posthog-js"
import {
  Check,
  X,
  Sparkles,
  Store,
  Calendar,
  Crown,
} from "lucide-react"
import { PLAN_DEFINITIONS, getInstallmentAmount, getInstallmentTotal } from "@/lib/plans"

const planDefs = Object.values(PLAN_DEFINITIONS).filter((p) => p.activo)

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

const planCards = [
  {
    id: "agenda",
    label: "Agenda",
    desc: "Sistema de agendamiento inteligente para servicios por cita.",
    icon: Calendar,
    iconBg: "from-amber-500 to-amber-700",
    price: 15,
    yearlyPrice: 150,
    popular: false,
  },
  {
    id: "comercio",
    label: "Emprendedor",
    desc: "Tienda online + agenda + CRM para minoristas.",
    icon: Store,
    iconBg: "from-primary to-blue-600",
    price: 25,
    yearlyPrice: 250,
    popular: true,
  },
  {
    id: "mayorista",
    label: "Mayorista",
    desc: "Sistema B2B para distribuidoras y mayoristas.",
    icon: Crown,
    iconBg: "from-slate-700 to-slate-900",
    price: 45,
    yearlyPrice: 450,
    popular: false,
  },
]

const faqs = [
  { q: "¿Necesito tener conocimientos técnicos?", a: "No. Panitas está diseñado para que cualquier emprendedor pueda gestionar su negocio sin escribir código." },
  { q: "¿Cómo recibo el dinero de las ventas?", a: "El dinero va directamente a tus cuentas bancarias. Panitas no intermedia ni retiene tus fondos." },
  { q: "¿Hay comisiones por venta?", a: "No cobramos comisiones. Todo lo que vendas es 100% tuyo. Solo pagas la suscripción mensual." },
  { q: "¿Puedo cambiar de plan?", a: "Sí, puedes actualizar tu plan en cualquier momento desde configuración." },
  { q: "¿Puedo pagar en 2 cuotas?", a: "Sí, todos los planes ofrecen la opción de pago en 2 cuotas. Pagas la primera hoy y la segunda a los 15 días." },
  { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos transferencia bancaria, Pago Móvil, Zelle y próximamente tarjetas internacionales." },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function capturePlanSelected(planId: string, period: string, paymentMode: string) {
    posthog.capture("plan_selected", { plan: planId, period, payment_mode: paymentMode, authenticated: !!session })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-heading text-lg font-bold text-[#050505]">
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
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-[#050505]/80 hover:bg-gray-50">Iniciar sesión</Button>
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
          <Badge variant="outline" className="mb-4 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="mr-1.5 size-3.5" />
            Sin comisiones por venta
          </Badge>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-accent sm:text-5xl lg:text-6xl">
            El plan perfecto para tu <span className="text-primary">negocio</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[#6B7280]">
            Tienda online, agenda de citas, CRM y automatizaciones en una sola plataforma. Elige el plan que necesitas y activa solo lo que usas.
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <button onClick={() => setBillingCycle("monthly")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-accent text-white shadow-lg" : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"}`}>
          Mensual
        </button>
        <button onClick={() => setBillingCycle("yearly")} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-accent text-white shadow-lg" : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"}`}>
          Anual
          <Badge className="bg-primary text-[9px] text-accent px-2 py-0.5 font-bold">Ahorra 20%</Badge>
        </button>
      </div>

      {/* Pricing cards */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {planCards.map((card, idx) => {
            const plan = planDefs.find((p) => p.id === card.id)
            const monthlyPrice = billingCycle === "monthly" ? card.price : (card.yearlyPrice / 12).toFixed(0)
            const installmentAmt = getInstallmentAmount(card.id)
            const installmentTotal = getInstallmentTotal(card.id)
            const PlanIcon = card.icon

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * idx }}
                className={`relative flex flex-col rounded-3xl glass-dark p-6 shadow-sm transition-all hover:shadow-md ${card.popular ? "border-2 border-primary shadow-xl shadow-primary/5 scale-[1.03]" : ""}`}
              >
                {card.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-accent font-bold text-[10px] px-4 py-1 shadow-lg shadow-primary/20">Más Elegido</Badge>
                  </div>
                )}
                <div className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.iconBg}`}>
                  <PlanIcon className="size-5 text-white" />
                </div>
                <h3 className="font-heading text-lg font-bold text-accent">Plan {card.label}</h3>
                <p className="mb-4 text-xs text-[#6B7280]">{card.desc}</p>

                {billingCycle === "monthly" && (
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-accent">${monthlyPrice}</span>
                      <span className="text-sm text-[#6B7280]/50">/mes</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-sm font-semibold text-[#6B7280]/70">${installmentAmt}</span>
                      <span className="text-xs text-[#6B7280]/40">/cuota · 2 cuotas (${installmentTotal} total)</span>
                    </div>
                  </div>
                )}
                {billingCycle === "yearly" && (
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-accent">${monthlyPrice}</span>
                      <span className="text-sm text-[#6B7280]/50">/mes</span>
                    </div>
                    <span className="ml-2 text-xs text-[#6B7280]/50 line-through">${card.price}/mes</span>
                  </div>
                )}

                <ul className="mb-6 flex-1 space-y-2">
                  {plan?.modules.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-xs text-[#050505]/80">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      {moduleLabels[m] || m}
                    </li>
                  ))}
                </ul>

                {billingCycle === "monthly" ? (
                  <div className="flex flex-col gap-2">
                    <Link href={session ? `/subscribe?plan=${card.id}&period=monthly&paymentMode=single` : `/register?plan=${card.id}&paymentMode=single`} onClick={() => capturePlanSelected(card.id, "monthly", "single")}>
                      <Button size="lg" className={`w-full h-11 rounded-xl text-xs font-bold ${card.popular ? "bg-primary text-accent hover:brightness-105 shadow-lg shadow-primary/20" : "bg-accent text-white hover:bg-accent/90"}`}>
                        Pago único · ${card.price}/mes
                      </Button>
                    </Link>
                    <Link href={session ? `/subscribe?plan=${card.id}&period=monthly&paymentMode=installment` : `/register?plan=${card.id}&paymentMode=installment`} onClick={() => capturePlanSelected(card.id, "monthly", "installment")}>
                      <Button variant="outline" size="sm" className="w-full h-9 rounded-xl text-xs font-bold text-[#6B7280] border-gray-200 hover:bg-gray-50">
                        2 cuotas de ${installmentAmt} (${installmentTotal})
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Link href={session ? `/subscribe?plan=${card.id}&period=yearly` : `/register?plan=${card.id}&paymentMode=single`} onClick={() => capturePlanSelected(card.id, "yearly", "single")}>
                    <Button size="lg" className={`w-full h-11 rounded-xl text-xs font-bold ${card.popular ? "bg-primary text-accent hover:brightness-105 shadow-lg shadow-primary/20" : "bg-accent text-white hover:bg-accent/90"}`}>
                      Elegir plan
                    </Button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center font-heading text-3xl font-extrabold text-accent sm:text-4xl">Comparativa de planes</h2>
        <div className="overflow-hidden rounded-3xl glass-dark shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-4 text-left font-bold text-accent">Módulo</th>
                <th className="px-5 py-4 text-center font-bold text-[#050505]/80">Agenda</th>
                <th className="px-5 py-4 text-center font-bold text-[#050505]/80">Emprendedor</th>
                <th className="px-5 py-4 text-center font-bold text-[#050505]/80">Mayorista</th>
              </tr>
            </thead>
            <tbody>
              {allModules.map((mod, i) => (
                <tr key={mod} className={`${i % 2 === 0 ? "bg-gray-50" : ""}`}>
                  <td className="px-5 py-3 text-[#050505]/80">{moduleLabels[mod]}</td>
                  {planCards.map((card) => (
                    <td key={card.id} className="px-5 py-3 text-center">
                      {planDefs.find((p) => p.id === card.id)?.modules.includes(mod as any) ? (
                        <Check className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <X className="mx-auto size-4 text-gray-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td className="px-5 py-3 font-semibold text-accent">Productos</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">—</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">Ilimitados</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">Ilimitados</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-5 py-3 font-semibold text-accent">Miembros del equipo</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">1</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">3</td>
                <td className="px-5 py-3 text-center text-sm text-[#050505]/80">10</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-5 py-3 font-semibold text-accent">2 cuotas disponibles</td>
                <td className="px-5 py-3 text-center">
                  <Check className="mx-auto size-4 text-emerald-500" />
                </td>
                <td className="px-5 py-3 text-center">
                  <Check className="mx-auto size-4 text-emerald-500" />
                </td>
                <td className="px-5 py-3 text-center">
                  <Check className="mx-auto size-4 text-emerald-500" />
                </td>
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
            <div key={idx} className="rounded-2xl glass overflow-hidden transition-all">
              <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="flex w-full items-center justify-between px-6 py-5 text-left font-bold text-accent transition-colors hover:bg-gray-50">
                <span className="text-sm">{faq.q}</span>
                <motion.span animate={{ rotate: openFaq === idx ? 180 : 0 }} className="text-[#6B7280]/50 shrink-0 ml-4">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm text-[#6B7280] leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#071A33] to-[#071A33]/95 py-20">
        <div className="pointer-events-none absolute -left-40 top-0 size-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">Comienza hoy, es gratis</h2>
          <p className="mt-4 text-white/80">Crea tu tienda o agenda en minutos. Sin tarjeta de crédito. Sin compromisos.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={session ? "/subscribe" : "/register"}>
              <Button size="lg" className="h-13 rounded-xl bg-primary text-accent font-bold px-8 text-base shadow-xl shadow-primary/30 hover:brightness-105">
                {session ? "Adquirir un plan" : "Crear cuenta gratis"}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/50">Tasa BCV del día garantizada en todos los planes. Sin comisiones por venta.</p>
        </div>
      </section>

      <footer className="bg-[#071A33] px-6 py-8">
        <div className="mx-auto max-w-7xl text-center text-xs text-white/50">
          <p className="mb-2">Hecho en Venezuela con ❤️ para todos los emprendedores.</p>
          <div className="flex justify-center gap-6">
            {["Términos", "Privacidad", "Contacto", "FAQ"].map((link) => {
              const href = link === "Términos" ? "/terminos" : link === "Privacidad" ? "/privacidad" : link === "FAQ" ? "/faq" : link === "Contacto" ? "/contacto" : "/"
              return (
                <Link key={link} href={href} className="text-white/50 hover:text-white transition-colors">{link}</Link>
              )
            })}
          </div>
        </div>
      </footer>
    </div>
  )
}
