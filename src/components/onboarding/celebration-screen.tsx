"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { CheckCircle, CreditCard, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics/track"

interface Props {
  businessName: string
  planName: string
  storeUrl: string
  onFinish: () => void
}

function Confetti() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 30,
    color: ["#184BBF", "#FFB92E", "#22C55E", "#EF4444", "#A855F7", "#EC4899"][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          initial={{ opacity: 0, scale: 0, rotate: 0, top: `${p.y}%`, left: `${p.x}%` }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.5],
            rotate: [0, p.rotation, p.rotation * 2],
            top: `${p.y + 100}%`,
            left: `${p.x + (Math.random() - 0.5) * 20}%`,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
          style={{ width: p.size, height: p.size, background: p.color }}
        />
      ))}
    </div>
  )
}

export function CelebrationScreen({ businessName, planName, storeUrl, onFinish }: Props) {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    track("celebration_viewed")
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <Confetti />

      <motion.div
        className="mx-auto max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl backdrop-blur-md text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={showContent ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={showContent ? { scale: 1, rotate: 0 } : {}}
          transition={{ delay: 0.2, type: "spring", stiffness: 180 }}
          className="mb-6"
        >
          <span className="inline-flex size-24 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="size-12 text-primary" />
          </span>
        </motion.div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          ¡Tu negocio está listo!
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Todo está configurado. Ahora vamos a prepararlo para recibir tu primera venta.
        </p>

        <div className="mb-8 rounded-2xl border bg-card p-6 text-left">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Negocio</span>
              <span className="font-semibold">{businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-semibold capitalize">{planName}</span>
            </div>
            {storeUrl && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tu enlace</span>
                <span className="font-mono text-xs text-primary">{storeUrl}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            className="h-14 w-full max-w-sm rounded-xl text-base font-semibold shadow-lg"
            onClick={() => {
              track("pay_now_clicked")
              router.push(`/subscribe?plan=${planName.toLowerCase()}`)
            }}
          >
            <CreditCard className="mr-2 size-5" />
            Pagar ahora
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full max-w-sm rounded-xl text-base font-semibold"
            onClick={() => {
              track("pay_later_clicked")
              onFinish()
            }}
          >
            <LayoutDashboard className="mr-2 size-5" />
            Ir al dashboard y pagar después
          </Button>

          <p className="pt-2 text-xs text-muted-foreground">
            Mientras no actives tu plan podrás ver todas las funciones, pero no podrás
            modificar ni crear contenido.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
