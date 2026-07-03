"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { Navbar } from "@/components/shared/navbar"
import { Badge } from "@/components/ui/badge"
import { Reveal } from "./reveal"
import { CountUp } from "./count-up"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  ArrowRight, TrendingUp, DollarSign, Package, Smartphone, BarChart3,
  CheckCircle, Star, ShoppingBag, ChevronDown, MessageCircle, Quote, Sliders,
  Sparkles, ShieldCheck, ArrowUpRight, Check, Calendar, Store, LayoutDashboard, ShoppingCart
} from "lucide-react"

const PricingToggle = dynamic(() => import("./pricing-toggle"))

const features = [
  {
    icon: DollarSign, title: "PanaPago Integrado",
    desc: "Cobra por Pago Móvil, transferencias, Binance y divisas. La tasa BCV se actualiza automáticamente para que siempre cobres el monto correcto.",
    badge: "Pasarela Nacional",
    color: "from-amber-400 to-orange-500",
  },
  {
    icon: Store, title: "Tienda Virtual Profesional",
    desc: "Publica productos con fotos, inventario, categorías y precios. Comparte tu tienda con un enlace y recibe pedidos automáticamente.",
    badge: "E-Commerce",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: Calendar, title: "Agenda de Citas y Reservas",
    desc: "Ideal para barberos, estilistas, médicos, mecánicos, entrenadores, restaurantes, hoteles o cualquier profesional que trabaje por citas o reservas. Tus clientes reservan en línea y tú administras todo desde un solo panel.",
    badge: "Reservas Online",
    color: "from-emerald-400 to-teal-500",
  },
]

const valueProps = [
  { icon: ShoppingBag, title: "Tienda en 5 Minutos", desc: "Sube tus productos con fotos, precios y stock al instante." },
  { icon: BarChart3, title: "Analíticas Profesionales", desc: "Reportes de ventas diarias, productos populares y márgenes claros." },
  { icon: ShieldCheck, title: "Sin Comisiones Ocultas", desc: "Las ventas son 100% tuyas. Solo pagas la suscripción de tu plan." },
  { icon: MessageCircle, title: "Soporte entre Panas", desc: "Asistencia directa vía WhatsApp para resolver cualquier duda." },
]

const plans = [
  {
    name: "Plan Emprendedor",
    priceMonthly: "15",
    priceYearly: "12",
    description: "Elige Tienda o Reservas. Ideal para empezar tu negocio.",
    modes: [
      { label: "Emprendedor", icon: "Store", features: ["Catálogo público con enlace personalizado", "Gestión de productos ilimitados", "Pedidos y ventas automatizadas", "Pago Móvil, transferencias y Zelle", "Actualización de tasa BCV automática", "WhatsApp integrado", "Soporte comunitario"] },
      { label: "Reservas", icon: "Calendar", features: ["Sistema de agenda de citas online", "Gestión de servicios y categorías", "Calendario de disponibilidad en tiempo real", "Bloqueo de horarios", "Notificaciones automáticas", "WhatsApp integrado", "Soporte comunitario"] },
    ],
    cta: "Elegir plan", highlight: false,
  },
  {
    name: "Plan Negocio",
    priceMonthly: "25",
    priceYearly: "20",
    description: "Tienda Y Agenda en una misma cuenta. Cambia entre módulos libremente.",
    features: ["Tienda online + Agenda de citas incluidos", "Productos y servicios ilimitados", "CRM completo con gestión de clientes", "Reportes avanzados y analíticas", "Automatizaciones de marketing", "Multi-usuario (hasta 5 miembros)", "Pago Móvil, transferencias, Zelle y divisas", "Soporte prioritario por WhatsApp"],
    cta: "Elegir Negocio", highlight: true,
  },
  {
    name: "Plan Empresarial",
    priceMonthly: "35",
    priceYearly: "28",
    description: "Sistema B2B para mayoristas con clientes, precios por volumen y cotizaciones.",
    features: ["Todo lo del plan Negocio incluido", "Sistema B2B para clientes mayoristas", "Precios por volumen personalizados", "Cotizaciones y órdenes de compra", "Multi-usuario (hasta 10 miembros)", "Reportes financieros avanzados", "Soporte prioritario 24/7"],
    cta: "Elegir Empresarial", highlight: false,
  },
]

const testimonials = [
  { name: "María Gabriela", role: "Fundadora de Chic & Kids", text: "Solía perder horas enviando fotos y precios por WhatsApp. Con Panitas, mis clientes compran directamente en mi catálogo y yo solo recibo las notificaciones de Pago Móvil listas para despachar. ¡Una maravilla!", tag: "Moda Infantil" },
  { name: "Carlos Rondón", role: "Director de TechVenezuela", text: "Lo que más valoro es la tasa de cambio BCV automática. Los precios en bolívares se calculan solos y de forma exacta, eliminando las discusiones con los clientes por el cambio del día. Se siente súper profesional.", tag: "Tecnología" },
  { name: "Ana Lucía Reyes", role: "Propietaria de VerdeAmor", text: "Subir mis productos de cosmética natural desde el celular fue extremadamente sencillo. En menos de una hora tenía mi tienda lista y con los métodos de pago configurados. Es el Shopify criollo.", tag: "Cosmética Orgánica" },
]

const faqs = [
  { q: "¿Necesito tener conocimientos técnicos o de programación?", a: "Para nada. Panitas está diseñado específicamente para que cualquier emprendedor pueda crear y gestionar su tienda en línea desde su celular en cuestión de minutos, sin escribir una sola línea de código." },
  { q: "¿Cómo recibo el dinero de las ventas?", a: "El dinero va directamente a tus cuentas bancarias. Panitas no intermedia ni retiene tus fondos. Configurase tu Pago Móvil y cuentas de transferencia bancaria, y tus clientes te pagarán directamente a ti." },
  { q: "¿Cómo funciona la tasa de cambio BCV automática?", a: "Nuestra plataforma se conecta con los datos oficiales del Banco Central de Venezuela. Si fijas tus precios en dólares, el sistema calculará automáticamente el monto exacto en bolívares para tus clientes basándose en la tasa oficial del día." },
  { q: "¿Puedo usar mi propio dominio personalizado?", a: "Sí, por supuesto. En el plan Avanzado puedes conectar tu propio dominio (ej. mitienda.com) para darle una presencia aún más profesional a tu marca. En los demás planes dispones de un subdominio gratuito tipo panitas.app/mitienda." },
  { q: "¿Hay comisiones por venta?", a: "No cobramos ninguna comisión por tus ventas. Todo lo que vendas a través de tu tienda online es 100% tuyo. Solo pagas la tarifa de suscripción mensual o anual fija correspondiente al plan que elijas." },
]

export default function LandingContent() {
  return (
    <div className="relative min-h-screen bg-slate-50/50 dark:bg-slate-950 selection:bg-primary selection:text-accent overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 shadow-[0_0_12px_#FFB92E]" />

      <Navbar />

      <div className="pointer-events-none absolute -top-40 right-[-10%] z-0 h-[600px] w-[600px] rounded-full bg-linear-to-tr from-primary/10 via-indigo-500/5 to-purple-500/10 blur-3xl" />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#102A43] via-[#102A43] to-slate-900 pb-28 pt-12 text-white md:pb-36 md:pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent opacity-75" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50/50 dark:from-slate-950 to-transparent" />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 px-4 md:flex-row">
          <div className="flex-1 space-y-7 text-center md:text-left">
            <Badge variant="outline" className="border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-primary shadow-inner backdrop-blur-md">
              <Sparkles className="mr-1.5 size-3.5 fill-current text-primary" />
              El pana que tu negocio necesita.
            </Badge>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Panitas.
              <span className="mt-2 block bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent bg-[size:200%]">Todo lo que tu negocio necesita.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-slate-300 md:text-xl">
              Panitas reúne todo lo que necesitas para vender desde un solo lugar. Crea una tienda virtual para vender productos o un sistema de citas y reservas para ofrecer tus servicios profesionales. Cobra por Pago Móvil, transferencias y divisas, administra pedidos o reservas y olvídate de vender únicamente por WhatsApp.
            </p>
            <div className="flex flex-col items-center gap-4 pt-2 sm:flex-row md:items-start">
              <Link href="/register" className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-amber-500 px-8 py-4 text-base font-bold text-accent shadow-lg shadow-primary/20 transition-all duration-300 hover:brightness-105 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]">
                Crear mi tienda gratis
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

            </div>
            <p className="pt-1 text-sm text-slate-400">Sin tarjetas de crédito. Registro en 1 minuto.</p>
          </div>

          <div className="relative w-full max-w-lg flex-1 md:max-w-none">
            <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-2xl" />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl md:p-5 overflow-hidden"
            >
              {/* Topbar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-[10px] tracking-wide text-slate-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  $ 1 = Bs. 63,50
                </div>
              </div>

              {/* Dashboard body: sidebar + content */}
              <div className="flex gap-3 h-[340px]">
                {/* Sidebar */}
                <div className="w-[130px] shrink-0 rounded-xl bg-[#102A43] p-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 mb-1 pb-2 border-b border-white/5">
                    <div className="size-5 rounded-lg bg-primary flex items-center justify-center">
                      <Store className="size-2.5 text-accent" />
                    </div>
                    <span className="text-[8px] font-extrabold text-white truncate">Mi Tienda</span>
                  </div>
                  {[
                    { icon: LayoutDashboard, label: "Inicio", active: true },
                    { icon: Package, label: "Productos", active: false },
                    { icon: ShoppingCart, label: "Pedidos", active: false },
                    { icon: BarChart3, label: "Analíticas", active: false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${item.active ? "bg-primary text-accent font-bold" : "text-slate-400"}`}>
                      <item.icon className="size-2.5" />
                      <span className="text-[6px] font-bold">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col gap-2.5">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Ventas Hoy", value: "$452.50", sub: "Bs. 20,136.25" },
                      { label: "Ventas Semana", value: "$2,890.00", sub: "+18.4%" },
                      { label: "Productos", value: "24", sub: "Activos" },
                      { label: "Pedidos", value: "18", sub: "4 pendientes" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-white/5 border border-white/5 p-2.5">
                        <p className="text-[7px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                        <p className="text-sm font-black text-white mt-0.5">{stat.value}</p>
                        <p className="text-[8px] text-slate-400">{stat.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart + recent order */}
                  <div className="flex gap-2 flex-1">
                    <div className="flex-1 rounded-lg bg-white/5 border border-white/5 p-2.5 flex flex-col">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Tendencia</span>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0 text-[7px] font-bold">
                          <TrendingUp className="size-2 mr-0.5" />
                          +18.4%
                        </Badge>
                      </div>
                      <svg className="h-full w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartH" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFB92E" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#FFB92E" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,18 C15,14 25,6 40,8 C55,10 65,2 80,4 C90,5 95,1 100,2" fill="none" stroke="#FFB92E" strokeWidth="2" strokeLinecap="round" />
                        <path d="M0,18 C15,14 25,6 40,8 C55,10 65,2 80,4 C90,5 95,1 100,2 L100,20 L0,20 Z" fill="url(#chartH)" />
                      </svg>
                    </div>

                    {/* Recent order */}
                    <div className="w-[130px] rounded-lg bg-white/5 border border-white/5 p-2.5 flex flex-col justify-between">
                      <div>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-1">Último pedido</p>
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="size-5 rounded-md bg-primary/20 flex items-center justify-center text-[7px] font-black text-primary">MP</div>
                          <div>
                            <p className="text-[8px] font-semibold text-white leading-tight">María P.</p>
                            <p className="text-[6px] text-slate-400">Pago Móvil</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                        <span className="text-[6px] text-emerald-400 font-semibold">Aprobado</span>
                        <span className="text-[9px] font-bold text-white">Bs. 2.002</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── METRICS ─── */}
      <section className="relative z-10 px-4 py-8 md:-translate-y-12">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white dark:bg-slate-900 shadow-lg p-4 md:p-5">
          <div className="grid grid-cols-1 gap-4 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            {[
              { value: "500+", label: "Negocios digitales creados" },
              { value: "", label: "" },
              { value: "5 minutos", label: "Tiempo promedio de configuración inicial" },
            ].map((metric, idx) => (
              <Reveal key={idx} delay={idx * 0.1} className="flex flex-col items-center justify-center py-3 md:py-4 text-center">
                {metric.value ? (
                  <p className="font-heading text-2xl md:text-3xl font-black text-accent bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    <CountUp value={metric.value} />
                  </p>
                ) : (
                  <p className="font-heading text-xl md:text-2xl font-black text-accent leading-tight">
                    Miles de
                    <span className="block bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">pedidos y reservas</span>
                    gestionadas
                  </p>
                )}
                {metric.label && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:text-sm">
                    {metric.label}
                  </p>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="caracteristicas" className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3.5 py-1">Características del Sistema</Badge>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Dos soluciones para hacer crecer tu negocio</h2>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">Ya sea que vendas productos o prestes servicios, Panitas reúne todas las herramientas que necesitas para administrar tu negocio desde un solo lugar.</p>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, idx) => (
              <Reveal key={idx} delay={idx * 0.15} className="group relative overflow-hidden rounded-2xl border border-white/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-8 shadow-xs backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:border-primary/40">
                <div className="absolute -right-8 -top-8 size-24 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-primary/10 transition-colors duration-500" />
                <div className={`mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-linear-to-tr ${feature.color} text-white shadow-md shadow-slate-100`}>
                  <feature.icon className="size-6.5" />
                </div>
                <Badge variant="secondary" className="mb-3 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{feature.badge}</Badge>
                <h3 className="font-heading mb-3 text-lg font-bold text-accent group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </Reveal>
                ))}
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map((prop, idx) => (
              <Reveal key={idx} delay={idx * 0.08} className="flex items-start gap-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-5 backdrop-blur-xs transition-colors duration-300 hover:bg-white/60 dark:hover:bg-slate-900/60">
                <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-accent font-bold">
                  <prop.icon className="size-4.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-accent text-sm">{prop.title}</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{prop.desc}</p>
                  </div>
                </Reveal>
              ))}
          </div>
        </div>
      </section>

      {/* ─── TIMELINE ─── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4">
          <Reveal className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3.5 py-1">Pasos Sencillos</Badge>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Comienza a vender en menos de 5 minutos</h2>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">Solo necesitas crear tu cuenta, elegir el tipo de negocio y empezar a recibir pedidos o reservas.</p>
          </Reveal>

          <div className="relative border-l border-slate-200/80 dark:border-slate-700 ml-4 md:ml-32 space-y-12 py-2">
            {[
              { num: "01", title: "Crea tu cuenta", desc: "Regístrate con tu correo y crea el nombre de tu negocio. Tu tienda o sistema de reservas estará listo en minutos." },
              { num: "02", title: "Configura tu negocio", desc: "Elige si deseas una Tienda Virtual para vender productos o un Sistema de Citas para ofrecer servicios. Configura tus métodos de pago y listo." },
              { num: "03", title: "Empieza a recibir clientes", desc: "Publica tus productos o configura tu agenda de citas. Comparte tu enlace y comienza a recibir pedidos o reservas automáticamente." },
            ].map((step, idx) => (
              <Reveal key={idx} delay={idx * 0.1} className="relative pl-8 md:pl-12 group">
                <div className="absolute left-[-17px] top-0 size-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-slate-400 dark:text-slate-500 transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-accent shadow-xs">
                  {step.num}
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-lg font-bold text-accent group-hover:text-primary transition-colors duration-300">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 max-w-xl">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="precios" className="relative py-20 md:py-28 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center space-y-4 mb-10">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3.5 py-1">Planes Flexibles</Badge>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Planes que escalan con tu éxito</h2>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">Elige el plan ideal para tu negocio. Sin comisiones por venta. Cancela cuando quieras.</p>
            <PricingToggle plans={plans} />
          </Reveal>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3.5 py-1">Testimonios de Clientes</Badge>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Lo que dicen nuestros panitas</h2>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">Pequeños y grandes emprendedores venezolanos impulsando su negocio y automatizando sus ventas.</p>
          </Reveal>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((test, idx) => (
              <Reveal key={idx} delay={idx * 0.12} className="relative rounded-2xl border border-white/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-6 shadow-xs backdrop-blur-md flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <Quote className="size-8 text-primary/20" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed italic">"{test.text}"</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-xs font-bold text-accent">{test.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{test.role}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{test.tag}</Badge>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="relative py-20 md:py-28 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-3xl px-4">
          <Reveal className="text-center space-y-4 mb-16">
            <Badge variant="outline" className="border-accent/10 bg-accent/5 text-accent px-3.5 py-1">Soporte e Información</Badge>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Preguntas Frecuentes</h2>
            <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">¿Tienes dudas sobre cómo operar tu tienda en línea? Te lo aclaramos todo aquí.</p>
          </Reveal>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 shadow-2xs backdrop-blur-xs transition-colors duration-300 hover:bg-white/80 dark:hover:bg-slate-900/80">
                <summary className="flex w-full items-center justify-between px-6 py-4.5 text-left text-sm font-bold text-accent cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <ChevronDown className="size-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="border-t border-slate-100 dark:border-slate-700 px-6 py-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative px-4 py-20 md:py-28 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-slate-900 p-8 text-center text-white shadow-2xl backdrop-blur-md md:p-14 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-tr from-accent via-slate-900 to-slate-950 opacity-95" />
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">¿Listo para dar el gran salto digital?</h2>
            <p className="text-slate-300 text-base md:text-lg max-w-lg mx-auto">Únete a las marcas venezolanas que están multiplicando sus ventas automatizando sus catálogos con Panitas.</p>
            <div className="pt-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register" className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-accent shadow-lg shadow-primary/15 transition-all duration-300 hover:brightness-105 active:scale-[0.98]">
                Montar mi tienda ahora
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:bg-white/10">
                Ingresar al Sistema
              </Link>
            </div>
            <p className="text-xs text-slate-400 pt-2">Tasa BCV del día garantizada en todos los planes.</p>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <Reveal className="mx-auto max-w-2xl px-4 pb-20 text-center">
        <h2 className="mb-4 font-heading text-3xl font-extrabold text-accent sm:text-4xl">¿Alguna pregunta?</h2>
        <p className="mb-2 text-lg text-slate-500 dark:text-slate-400">Ponerte en contacto con nosotros es muy fácil</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a href="https://wa.me/584241234567?text=Hola%20Panitas%2C%20tengo%20una%20consulta" target="_blank" rel="noopener noreferrer">
            <button className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-green-500 px-8 text-base font-bold text-white shadow-xl shadow-green-500/30 transition-all hover:bg-green-600">
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Escríbenos por WhatsApp
            </button>
          </a>
          <a href="https://instagram.com/panitas.app" target="_blank" rel="noopener noreferrer">
            <button className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 text-base font-bold text-accent dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Escríbenos por Instagram
            </button>
          </a>
        </div>
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Siempre responderemos lo más rápido posible</p>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">También nos puedes escribir directamente desde tu servicio de Email a{' '}
          <a href="mailto:panitasapp@gmail.com" className="text-primary font-medium hover:underline">panitasapp@gmail.com</a>
        </p>
      </Reveal>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-2.5 font-heading text-lg font-bold tracking-wider text-white">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary"><img src="/favicon.jpg" alt="Panitas" className="size-6 object-contain" /></span>
              PANITAS
            </div>
            <div className="flex gap-8 text-xs font-bold uppercase tracking-wider">
              {["Términos", "Privacidad", "Contacto", "FAQ"].map((link, idx) => {
                const href = link === "Términos" ? "/terminos" : link === "Privacidad" ? "/privacidad" : link === "FAQ" ? "/faq" : link === "Contacto" ? "/contacto" : "#"
                return (
                  <Link key={idx} href={href} className="hover:text-white transition-colors duration-200">{link}</Link>
                )
              })}
            </div>
          </div>
          <div className="mt-10 pt-10 border-t border-white/5 text-center text-xs text-slate-500">Hecho en Venezuela con ❤️ para todos los emprendedores del país.</div>
        </div>
      </footer>

      <a href="https://wa.me/584241234567" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/10 hover:bg-emerald-600 transition-colors" aria-label="WhatsApp Soporte">
        <MessageCircle className="size-7 fill-white text-emerald-500" />
      </a>
    </div>
  )
}
