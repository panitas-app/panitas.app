"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sliders, Check, LayoutDashboard, Package, ShoppingCart, BarChart3, TrendingUp, DollarSign, Users, Store, Crown } from "lucide-react"
import { motion } from "framer-motion"

export default function Simulator() {
  const [storeName, setStoreName] = useState("Tienda Pana")
  const [storeColor, setStoreColor] = useState("#FFB92E")
  const [storeNiche, setStoreNiche] = useState<"moda" | "cafe" | "gadgets">("moda")

  return (
    <section id="simulator" className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20 md:py-28 border-y border-slate-100 dark:border-slate-800">
      <div className="absolute right-[10%] top-[20%] size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center space-y-4 mb-16 animate-fade-up">
          <Badge variant="outline" className="border-accent/10 bg-accent/5 text-accent px-3.5 py-1">Simulador Interactivo</Badge>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-accent md:text-4xl">Crea el diseño de tu marca en tiempo real</h2>
          <p className="mx-auto max-w-xl text-slate-600 dark:text-slate-400">Personaliza el nombre, elige tus colores y tu tipo de negocio. Observa cómo se adaptaría tu sitio de forma inmediata.</p>
        </div>

        <div className="mx-auto max-w-5xl rounded-3xl border border-white/60 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-6 shadow-xl backdrop-blur-md md:p-8">
          <div className="flex flex-col gap-10 md:flex-row">
            <div className="flex-1 space-y-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-accent flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  Panel de Control
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configura las opciones visuales del simulador</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Nombre de la Tienda</label>
                <Input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value || "Mi Tienda")}
                  placeholder="Escribe el nombre de tu marca..." className="rounded-xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 focus-visible:ring-primary" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">Color de Marca</label>
                <div className="flex gap-3">
                  {[
                    { hex: "#FFB92E", name: "Amber" },
                    { hex: "#184BBF", name: "Royal" },
                    { hex: "#10B981", name: "Emerald" },
                    { hex: "#8B5CF6", name: "Purple" }
                  ].map((col) => (
                    <button key={col.hex} onClick={() => setStoreColor(col.hex)}
                      className="size-8 rounded-full border border-slate-200 dark:border-slate-600 transition-all duration-300 relative"
                      style={{ backgroundColor: col.hex }} title={col.name}>
                      {storeColor === col.hex && (
                        <span className="absolute inset-[-4px] rounded-full border-2" style={{ borderColor: col.hex }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">Nicho de Negocio</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "moda", label: "👗 Moda" },
                    { key: "cafe", label: "☕ Café" },
                    { key: "gadgets", label: "⚡ Gadgets" }
                  ].map((niche) => (
                    <button key={niche.key} onClick={() => setStoreNiche(niche.key as any)}
                      className={`rounded-xl border py-3 text-xs font-bold transition-all duration-300 ${
                        storeNiche === niche.key
                          ? "bg-accent border-accent text-white shadow-md shadow-accent/15"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}>{niche.label}</button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 space-y-2.5">
                <h4 className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-500" /> Beneficios de este dashboard:
                </h4>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pl-5 list-disc">
                  <li>Panel con métricas en tiempo real de tu negocio.</li>
                  <li>Sidebar inteligente adaptada a tu plan.</li>
                  <li>Gráficos de ventas y tráfico web configurables.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center md:w-[380px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Dashboard en Vivo</span>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
              >
                {/* Topbar */}
                <div className="flex items-center justify-between h-10 px-4 border-b border-slate-100 dark:border-slate-800 bg-white/75 dark:bg-slate-950/80">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-emerald-600">$ 1 = Bs. 63,50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-amber-200/60 bg-amber-50/60">
                      <Crown className="size-2.5 text-amber-500" />
                      <span className="text-[7px] font-bold text-amber-700">Tienda</span>
                    </div>
                    <div className="size-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <span className="text-[6px] font-black text-slate-500 dark:text-slate-400">JP</span>
                    </div>
                  </div>
                </div>

                {/* Body: sidebar + content */}
                <div className="flex h-[320px]">
                  {/* Sidebar */}
                  <div className="w-[140px] bg-[#102A43] p-3 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-5 rounded-lg bg-primary flex items-center justify-center">
                        <Store className="size-2.5 text-white" />
                      </div>
                      <span className="text-[8px] font-extrabold text-white truncate">{storeName}</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="space-y-0.5">
                      {[
                        { icon: LayoutDashboard, label: "Inicio", active: true },
                        { icon: Package, label: "Productos", active: false },
                        { icon: ShoppingCart, label: "Pedidos", active: false },
                        { icon: Users, label: "Clientes", active: false },
                        { icon: BarChart3, label: "Analíticas", active: false },
                      ].map((item) => (
                        <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${item.active ? "bg-primary text-accent font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                          <item.icon className="size-3" />
                          <span className="text-[7px] font-bold">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                    <div className="text-[9px] font-black text-accent mb-2 flex items-center gap-1.5">
                      <TrendingUp className="size-3 text-primary" />
                      Panel de Control
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      {[
                        { label: "Ventas Hoy", value: "$156.00", color: "#2563eb" },
                        { label: "Ventas Semana", value: "$892.50", color: "#6366f1" },
                        { label: "Productos", value: "24", color: "#10b981" },
                        { label: "Pedidos", value: "18", color: "#8b5cf6" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: stat.color }} />
                          <p className="text-[6px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
                          <p className="text-[11px] font-black text-accent mt-0.5">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mini chart bars */}
                    <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[7px] font-bold text-accent">Ventas de la semana</span>
                        <span className="text-[6px] text-slate-400">Lun — Dom</span>
                      </div>
                      <div className="flex items-end gap-1 h-14">
                        {[40, 65, 35, 80, 55, 90, 70].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full rounded-t-sm transition-all duration-500"
                              style={{ height: `${h}%`, backgroundColor: storeColor }}
                            />
                            <span className="text-[5px] text-slate-400 font-semibold">
                              {["L", "M", "M", "J", "V", "S", "D"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
