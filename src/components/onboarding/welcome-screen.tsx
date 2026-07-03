"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"

interface Props {
  onStart: () => void
}

const items = [
  "Tu tienda profesional online",
  "Tu agenda de citas (si aplica)",
  "Tu enlace público para compartir",
  "14 días de prueba gratis · Sin tarjeta",
]

export function WelcomeScreen({ onStart }: Props) {
  useEffect(() => {
    track("welcome_viewed")
  }, [])

  const handleStart = () => {
    track("welcome_cta_clicked")
    onStart()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        className="mx-auto max-w-lg rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <span className="inline-flex size-20 items-center justify-center rounded-2xl bg-primary/10">
            <Store className="size-10 text-primary icon-hover-spin" />
          </span>
        </motion.div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Bienvenido a Panitas
        </h1>
        <p className="mb-10 text-lg text-muted-foreground">
          En menos de 3 minutos tendrás todo listo para empezar a vender.
        </p>

        <div className="mb-10 space-y-3 text-left">
          {items.map((item, i) => (
            <motion.div
              key={item}
              className="flex items-center gap-3 rounded-xl bg-muted/30 px-5 py-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
            >
              <CheckCircle className="size-5 shrink-0 text-primary" />
              <span className="text-sm font-medium">{item}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <Button
            size="lg"
            className="h-14 w-full max-w-sm rounded-xl text-base font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleStart}
          >
            Comenzar
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
