"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Props {
  isOpen: boolean
  onStart: () => void
  onReplay: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  rotation: number
  velocity: { x: number; y: number }
}

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"]

export function TourCelebration({ isOpen, onStart, onReplay }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!isOpen) {
      setParticles([])
      return
    }

    const items: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: 1.5 + Math.random() * 2,
      },
    }))
    setParticles(items)

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocity.x * 0.3,
            y: p.y + p.velocity.y * 0.5,
            rotation: p.rotation + 3,
          }))
          .filter((p) => p.y < 110)
      )
    }, 50)

    return () => clearInterval(interval)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                rotate: `${p.rotation}deg`,
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="relative z-10 mx-4 w-full max-w-md rounded-3xl border border-primary/20 bg-white p-8 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.4 }}
              className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-200"
            >
              <svg className="size-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <h2 className="font-heading text-2xl font-extrabold text-slate-900 mb-2">¡Listo!</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Ya conoces todas las herramientas de tu panel.
              <br />
              Ahora puedes comenzar a administrar tu negocio con <strong className="text-primary">Panitas</strong>.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={onStart}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all cursor-pointer"
              >
                Comenzar a trabajar
              </button>
              <button
                onClick={onReplay}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Volver a ver el tutorial
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
