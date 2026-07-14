"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useSession } from "next-auth/react"

const plans = [
  {
    id: "agenda",
    name: "Plan Agenda",
    price: 15,
    installmentAmount: 9,
    tagline: "Reserva y organiza con inteligencia",
    description:
      "Un sistema de agendamiento inteligente para profesionales que gestionan citas, turnos y reservas. Ideal para barberías, clínicas, consultorios y servicios por cita.",
    benefits: [
      "Calendario con disponibilidad en tiempo real",
      "Recordatorios automáticos por email",
      "Múltiples profesionales y sedes",
      "Dashboard de reservas y cancelaciones",
    ],
    videos: ["/videos/plans/agenda/agenda1.mp4", "/videos/plans/agenda/agenda2.mp4", "/videos/plans/agenda/agenda3.mp4"],
    accent: "#0066FF",
    bgGradient: "from-[#0066FF]/10 to-transparent",
  },
  {
    id: "comercio",
    name: "Plan Comercio",
    price: 25,
    installmentAmount: 14,
    tagline: "Tu negocio todo-en-uno",
    description:
      "La solución completa para emprendedores que quieren vender online, agendar citas y gestionar clientes desde un solo lugar. Tienda web + agenda + CRM.",
    benefits: [
      "Tienda online profesional con carrito",
      "Sistema de agenda y reservas",
      "CRM con historial de clientes",
      "Gestión de inventario en tiempo real",
      "Reportes de ventas y analytics",
      "Catálogo de productos ilimitado",
    ],
    videos: [
      "/videos/plans/emprendedor/emprendedor1.mp4",
      "/videos/plans/emprendedor/emprendedor2.mp4",
      "/videos/plans/emprendedor/emprendedor3.mp4",
    ],
    accent: "#FFD600",
    bgGradient: "from-[#FFD600]/10 to-transparent",
  },
  {
    id: "mayorista",
    name: "Plan Mayorista",
    price: 45,
    installmentAmount: 25,
    tagline: "Escala sin límites",
    description:
      "Solución enterprise para distribuidoras y mayoristas que necesitan control B2B, automatizaciones y gestión de comisiones. Todo lo que necesitas para escalar.",
    benefits: [
      "Todo lo del Plan Comercio",
      "Módulo B2B para mayoristas",
      "Automatización de notas de entrega",
      "Gestión de comisiones por vendedor",
      "Alertas de stock y pedidos",
      "Soporte prioritario 24/7",
      "API de integración",
    ],
    videos: [
      "/videos/plans/mayorista/mayorista1.mp4",
      "/videos/plans/mayorista/mayorista2.mp4",
      "/videos/plans/mayorista/mayorista3.mp4",
    ],
    accent: "#A78BFA",
    bgGradient: "from-[#A78BFA]/10 to-transparent",
  },
]

function VideoCycler({ videos, isActive, accent }: { videos: string[]; isActive: boolean; accent?: string }) {
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isActive) { setIdx(0); setLoaded(false); setError(false) }
  }, [isActive])

  if (!isActive) return null

  function handleEnded() {
    setLoaded(false); setError(false)
    setIdx((p) => (p + 1) % videos.length)
  }

  if (error) {
    return <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}11)` }} />
  }

  return (
    <video
      key={idx}
      muted
      playsInline
      autoPlay
      preload="metadata"
      onLoadedData={() => setLoaded(true)}
      onError={() => setError(true)}
      onEnded={handleEnded}
      className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    >
      <source src={videos[idx]} type="video/mp4" />
    </video>
  )
}

const contentVariants = {
  collapsed: { opacity: 0, y: 16 },
  hovered: { opacity: 1, y: 0 },
}

export default function ChoosePlanPage() {
  const { data: session } = useSession()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const expandedPlan = expandedId ? plans.find((p) => p.id === expandedId) : null

  return (
    <div className="min-h-screen bg-[#071A33] relative overflow-hidden">
      <style>{`@media (width<=768px){.plan-card-mobile{height:280px!important}}`}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#0066FF]/[0.05] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-[#FFD600]/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#A78BFA]/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 h-screen flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-6 shrink-0">
          <Link href="/" className="block w-20 sm:w-28">
            <img src="/logonuevo.png" alt="Panitas" className="w-full h-auto opacity-70 hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex-1" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-4 sm:mb-6"
        >
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-heading font-bold text-white tracking-tight leading-tight">
            Elige tu <span className="text-[#0066FF]">plan</span>
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-white/50 max-w-xl mx-auto px-4">
            Selecciona el que mejor se adapte a tu negocio. Empieza hoy y escala cuando quieras.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {expandedId && expandedPlan ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.92, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex items-center justify-center"
            >
              <div
                className="relative w-full max-w-5xl border border-white/10 overflow-y-auto max-h-full"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <VideoCycler videos={expandedPlan.videos} isActive={true} accent={expandedPlan.accent} />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#071A33]/90 via-[#071A33]/70 to-[#071A33]/90" />
                </div>

                <div className="relative p-5 sm:p-8 lg:p-12 xl:p-16">
                  <button
                    onClick={() => setExpandedId(null)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white transition-colors mb-5 sm:mb-8 group"
                  >
                    <svg
                      className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Volver a planes
                  </button>

                  <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-16 items-start">
                    <div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-white leading-tight">
                        {expandedPlan.name}
                      </h2>
                      <p className="mt-2 text-sm sm:text-base lg:text-lg text-white/50">{expandedPlan.tagline}</p>
                      <div className="mt-4 sm:mt-6 space-y-2">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-none" style={{ color: expandedPlan.accent }}>
                            ${expandedPlan.price}
                          </span>
                          <span className="text-sm sm:text-base lg:text-lg text-white/40 font-medium">/mes · pago único</span>
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white/60 leading-none">
                            ${expandedPlan.installmentAmount}
                          </span>
                          <span className="text-xs sm:text-sm text-white/40 font-medium">/cuota · 2 cuotas (${expandedPlan.installmentAmount * 2} total)</span>
                        </div>
                      </div>
                      <p className="mt-4 sm:mt-6 text-sm sm:text-base text-white/60 leading-relaxed">{expandedPlan.description}</p>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-5">Beneficios incluidos</h3>
                      <ul className="space-y-2.5 sm:space-y-3.5">
                        {expandedPlan.benefits.map((b, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-start gap-3"
                          >
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0"
                              style={{ color: expandedPlan.accent }}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span className="text-sm sm:text-base text-white/60">{b}</span>
                          </motion.li>
                        ))}
                      </ul>

                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 sm:mt-8 lg:mt-10 flex flex-col gap-3"
                      >
                        <Link
                          href={session ? `/subscribe?plan=${expandedPlan.id}&paymentMode=single` : `/register?plan=${expandedPlan.id}&paymentMode=single`}
                          className="group relative inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 min-h-[48px] bg-gradient-to-br from-[#0066FF] to-[#0044CC] text-white font-semibold text-sm sm:text-base rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,102,255,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <span className="relative z-10">Pagar · ${expandedPlan.price}/mes</span>
                          <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </Link>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                          <Link
                            href={session ? `/subscribe?plan=${expandedPlan.id}&paymentMode=installment` : `/register?plan=${expandedPlan.id}&paymentMode=installment`}
                            className="group relative inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 min-h-[44px] border border-white/15 text-white font-medium text-xs sm:text-sm rounded-lg overflow-hidden transition-all duration-200 hover:border-white/30 hover:bg-white/5 flex-1"
                          >
                            <span className="relative z-10">2 cuotas de ${expandedPlan.installmentAmount} (${expandedPlan.installmentAmount * 2})</span>
                            <svg className="relative z-10 w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                          <Link
                            href={session ? `/dashboard?plan=${expandedPlan.id}` : `/register?plan=${expandedPlan.id}&payLater=true`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-xs sm:text-sm font-medium text-white/30 border border-white/5 rounded-lg hover:border-white/15 hover:text-white/50 transition-all duration-200 group flex-1"
                          >
                            Ir al dashboard y pagar después
                            <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="flex-1 flex md:items-center justify-center overflow-hidden"
            >
              <div className="flex flex-col md:flex-row gap-3 sm:gap-4 lg:gap-6 w-full max-w-5xl justify-center items-stretch md:items-start overflow-y-auto md:overflow-visible max-h-full py-1 px-0.5">
                {plans.map((plan, i) => {
                  const isHovered = hoveredId === plan.id

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      onHoverStart={() => setHoveredId(plan.id)}
                      onHoverEnd={() => setHoveredId(null)}
                      onClick={() => setExpandedId(plan.id)}
                      className="relative cursor-pointer overflow-hidden transition-all duration-500 select-none w-full"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        border: isHovered ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isHovered
                          ? "0 20px 60px rgba(0,0,0,0.3)"
                          : "0 8px 32px rgba(0,0,0,0.15)",
                      }}
                    >
                      <motion.div
                        animate={{ height: isHovered ? 440 : 360 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="relative flex flex-col plan-card-mobile"
                      >
                        <div className="absolute inset-0 overflow-hidden">
                          <motion.div
                            initial={false}
                            animate={{ opacity: isHovered ? 0.35 : 0.2 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0"
                          >
                            <VideoCycler videos={plan.videos} isActive={true} accent={plan.accent} />
                          </motion.div>
                          <div className={`absolute inset-0 bg-gradient-to-b ${plan.bgGradient}`} />
                        </div>

                        <div className="relative p-4 sm:p-6 lg:p-7 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <motion.span
                              className="text-xs font-semibold uppercase tracking-widest"
                              style={{ color: plan.accent }}
                            >
                              Plan
                            </motion.span>
                            <motion.div
                              initial={false}
                              animate={{
                                opacity: isHovered ? 1 : 0,
                                scale: isHovered ? 1 : 0.8,
                              }}
                              transition={{ duration: 0.3, delay: isHovered ? 0.15 : 0 }}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${plan.accent}20` }}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                style={{ color: plan.accent }}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                            </motion.div>
                          </div>

                          <motion.h3
                            className="mt-2 text-lg sm:text-xl lg:text-2xl font-heading font-bold text-white leading-tight"
                            layout
                            transition={{ duration: 0.3 }}
                          >
                            {plan.name}
                          </motion.h3>

                          {/* Price always visible */}
                          <div className="pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-none" style={{ color: plan.accent }}>
                                ${plan.price}
                              </span>
                              <span className="text-xs sm:text-sm text-white/40">/mes</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-base sm:text-lg font-bold text-white/60 leading-none">
                                ${plan.installmentAmount}
                              </span>
                              <span className="text-[10px] sm:text-xs text-white/30">/cuota · 2 cuotas</span>
                            </div>
                          </div>

                          <motion.div
                            variants={contentVariants}
                            initial="collapsed"
                            animate={isHovered ? "hovered" : "collapsed"}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="pt-1 space-y-1 sm:space-y-1.5">
                              <p className="text-xs sm:text-sm text-white/60 leading-relaxed">{plan.description}</p>
                              <ul className="space-y-1 sm:space-y-1.5">
                                {plan.benefits.slice(0, 3).map((b, bi) => (
                                  <li key={bi} className="flex items-start gap-2 text-[11px] sm:text-xs text-white/50">
                                    <svg
                                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                                      style={{ color: plan.accent }}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                    >
                                      <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    {b}
                                  </li>
                                ))}
                                {plan.benefits.length > 3 && (
                                  <li className="text-xs font-medium" style={{ color: plan.accent }}>
                                    +{plan.benefits.length - 3} más
                                  </li>
                                )}
                              </ul>
                            </div>
                          </motion.div>

                          <div className="mt-auto" />

                          <motion.div
                            initial={false}
                            animate={{
                              opacity: isHovered ? 1 : 0,
                              y: isHovered ? 0 : 8,
                            }}
                            transition={{ duration: 0.3, delay: isHovered ? 0.1 : 0 }}
                            className="pt-3"
                          >
                            <div
                              className="text-xs font-semibold text-center py-2.5 px-5 rounded-lg transition-all duration-200"
                              style={{
                                background: `linear-gradient(135deg, ${plan.accent}15, ${plan.accent}08)`,
                                color: plan.accent,
                                border: `1px solid ${plan.accent}20`,
                              }}
                            >
                              Ver plan completo →
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center mt-4 sm:mt-8 shrink-0"
        >
          <Link href="/" className="text-xs sm:text-sm text-white/30 hover:text-white/60 transition-colors">
            ← Volver al inicio
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
