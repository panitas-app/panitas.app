"use client"

import { motion } from "framer-motion"

interface Props {
  current: number
  total: number
  className?: string
}

export function OnboardingProgress({ current, total, className = "" }: Props) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="h-1 bg-muted/30">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between px-6 py-3">
        <span className="text-xs font-medium text-white/70">
          Paso {current + 1} de {total}
        </span>
        {current > 0 && current < total - 1 && (
          <span className="text-xs text-white/50">Solo falta un minuto</span>
        )}
      </div>
    </div>
  )
}
