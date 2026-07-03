"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Circle, PartyPopper, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { track } from "@/lib/analytics/track"

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: "profile", label: "Completa tu perfil de tienda", completed: false },
  { id: "product", label: "Agrega tu primer producto", completed: false },
  { id: "share", label: "Comparte tu enlace público", completed: false },
  { id: "order", label: "Recibe tu primera orden", completed: false },
]

export function ActivationChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_ITEMS)
  const [showCelebration, setShowCelebration] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/checklist/status")
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) setItems(data.items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const allDone = items.every((i) => i.completed)
  const doneCount = items.filter((i) => i.completed).length
  const pct = Math.round((doneCount / items.length) * 100)

  // Check if celebration should show
  useEffect(() => {
    if (allDone && !loading) {
      const timer = setTimeout(() => setShowCelebration(true), 500)
      return () => clearTimeout(timer)
    }
  }, [allDone, loading])

  if (allDone && !showCelebration) return null

  return (
    <>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="font-semibold text-sm">Comienza aquí</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                item.completed ? "bg-primary/5" : "hover:bg-muted/30"
              )}
            >
              {item.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                >
                  <CheckCircle2 className="size-5 text-primary" />
                </motion.div>
              ) : (
                <Circle className="size-5 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "text-sm",
                  item.completed ? "text-primary line-through" : "text-foreground"
                )}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6"
            onClick={() => setShowCelebration(false)}
          >
            <motion.div
              className="max-w-sm w-full rounded-2xl bg-card p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mb-4"
              >
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
                  <PartyPopper className="size-8 text-primary" />
                </span>
              </motion.div>
              <h3 className="text-xl font-bold">¡Negocio en marcha!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Has completado todos los pasos iniciales. Tu tienda está lista para crecer.
              </p>
              <button
                onClick={() => setShowCelebration(false)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                <PartyPopper className="size-4" />
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
