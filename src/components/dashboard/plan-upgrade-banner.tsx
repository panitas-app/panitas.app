"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Crown, Sparkles, ArrowUp, Check, X, Rocket, ArrowRight } from "lucide-react"

interface PlanUpgradeBannerProps {
  planId: string
  modalidad: string | null
}

export function PlanUpgradeBanner({ planId, modalidad }: PlanUpgradeBannerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (planId !== "basico") return null

  const moduloNuevo = modalidad === "tienda" ? "Agenda" : "Tienda"

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/negocios/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el upgrade")
      }

      toast.success(data.mensaje || "¡Upgrade exitoso!")
      setShowConfirm(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Upgrade banner */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-background">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Rocket className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-accent">Plan Básico</span>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  {modalidad === "tienda" ? "Solo Tienda" : "Solo Agenda"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Desbloquea <span className="font-semibold text-accent">{moduloNuevo}</span> y todos los módulos combinados por solo <span className="font-semibold text-primary">$25/mes</span>.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            className="shrink-0 rounded-xl bg-primary text-accent font-bold shadow-sm hover:brightness-105 h-10 px-5 gap-1.5 text-xs"
          >
            <Crown className="size-3.5" />
            Mejorar a Negocio
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="rounded-3xl bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                      <Crown className="size-7" />
                    </div>
                    <h3 className="font-heading text-xl font-extrabold text-accent">
                      ¿Mejorar a Negocio?
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Pasa de <strong className="text-accent">$15/mes</strong> a <strong className="text-primary">$25/mes</strong> y obtén todos los módulos combinados.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-muted p-4 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Check className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-accent">Conservas todo tu contenido</p>
                        <p className="text-[10px] text-muted-foreground">
                          Tus {modalidad === "tienda" ? "productos, pedidos y clientes" : "servicios, horarios y citas"} se mantienen intactos.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-accent">Se desbloquea {moduloNuevo}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Tu nuevo módulo empezará sin datos, listo para que lo configures.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <ArrowRight className="size-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-accent">Switch libre entre módulos</p>
                        <p className="text-[10px] text-muted-foreground">
                          Cambia entre Tienda y Agenda desde el dashboard cuando quieras.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    El cambio es inmediato. Se registrará en tu historial de facturación.
                    {modalidad && ` Tu modalidad actual "${modalidad}" ya no aplica, tendrás ambos módulos activos.`}
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-11 text-xs font-bold"
                      onClick={() => setShowConfirm(false)}
                      disabled={loading}
                    >
                      <X className="size-3.5 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 rounded-xl bg-primary text-accent font-bold h-11 text-xs shadow-md shadow-primary/10 gap-1.5"
                      onClick={handleUpgrade}
                      disabled={loading}
                    >
                      {loading ? (
                        "Procesando..."
                      ) : (
                        <>
                          <Crown className="size-3.5" />
                          Mejorar ahora
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
