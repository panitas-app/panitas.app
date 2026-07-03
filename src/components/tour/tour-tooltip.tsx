"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Store, Menu, LayoutDashboard, DollarSign, TrendingUp, BarChart3,
  Users, ShoppingCart, Package, Globe, Settings, ExternalLink,
  Calendar, Clock, CheckCircle, Zap, Sparkles, Lightbulb, type LucideIcon,
} from "lucide-react"
import type { TourStep, TourPosition } from "@/lib/tour/types"

interface Props {
  step: TourStep
  currentIndex: number
  totalSteps: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onFinish: () => void
  position?: TourPosition
}

const iconMap: Record<string, LucideIcon> = {
  Store, Menu, LayoutDashboard, DollarSign, TrendingUp, BarChart3,
  Users, ShoppingCart, Package, Globe, Settings, ExternalLink,
  Calendar, Clock, CheckCircle, Zap, Sparkles,
}

function TourIcon({ icon }: { icon?: string }) {
  const Icon = icon ? iconMap[icon] : undefined
  if (!Icon) {
    return <Sparkles className="size-5 text-primary" />
  }
  return <Icon className="size-5 text-primary" />
}

function computeTooltipStyle(
  targetRect: DOMRect | null,
  position: TourPosition,
  tooltipWidth: number,
  tooltipHeight: number
): React.CSSProperties {
  if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }

  const gap = 16
  const sw = window.innerWidth
  const sh = window.innerHeight

  const clamp = (left: number, top: number) => ({
    left: Math.min(Math.max(left, 8), sw - tooltipWidth - 8),
    top: Math.min(Math.max(top, 8), sh - tooltipHeight - 8),
  })

  const fits = (left: number, top: number) =>
    left >= 8 && left + tooltipWidth <= sw - 8 && top >= 8 && top + tooltipHeight <= sh - 8

  const positions: Record<TourPosition, { left: number; top: number; transform: string }> = {
    right: {
      left: targetRect.right + gap,
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      transform: "translateY(0)",
    },
    left: {
      left: targetRect.left - gap - tooltipWidth,
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      transform: "translateY(0)",
    },
    top: {
      left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
      top: targetRect.top - gap - tooltipHeight,
      transform: "translateX(0)",
    },
    bottom: {
      left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
      top: targetRect.bottom + gap,
      transform: "translateX(0)",
    },
    center: {
      left: sw / 2 - tooltipWidth / 2,
      top: sh / 2 - tooltipHeight / 2,
      transform: "translate(0, 0)",
    },
  }

  // Try preferred position
  if (position !== "center" && fits(positions[position].left, positions[position].top)) {
    return positions[position]
  }

  // Try alternative positions
  const order: TourPosition[] = ["right", "left", "bottom", "top", "center"]
  const startIdx = order.indexOf(position)
  for (let i = 1; i < order.length; i++) {
    const p = order[(startIdx + i) % order.length]
    if (p === "center") continue
    if (fits(positions[p].left, positions[p].top)) {
      return positions[p]
    }
  }

  // Fallback: clamp preferred position within viewport
  if (position !== "center") {
    const clamped = clamp(positions[position].left, positions[position].top)
    return { left: clamped.left, top: clamped.top, transform: positions[position].transform }
  }

  return positions.center
}

const arrowStyle: Record<string, React.CSSProperties> = {
  right: { left: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)" },
  left: { right: -6, top: "50%", transform: "translateY(-50%) rotate(45deg)" },
  top: { bottom: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)" },
  bottom: { top: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)" },
  center: { display: "none" },
}

export function TourTooltip({
  step,
  currentIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  position: desiredPosition,
}: Props) {
  const [tooltipWidth] = useState(360)
  const [tooltipHeight] = useState(280)
  const isLast = currentIndex === totalSteps - 1
  const isFirst = currentIndex === 0

  const style = useMemo(
    () => computeTooltipStyle(targetRect, desiredPosition || "bottom", tooltipWidth, tooltipHeight),
    [targetRect, desiredPosition, tooltipWidth, tooltipHeight]
  )

  const arrow = arrowStyle[desiredPosition || "bottom"]
  const progress = ((currentIndex + 1) / totalSteps) * 100

  return (
    <AnimatePresence>
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-[9999] w-[360px] rounded-2xl border border-primary/20 bg-white shadow-2xl shadow-primary/10"
        style={style}
        role="dialog"
        aria-label={`Tutorial paso ${currentIndex + 1} de ${totalSteps}`}
      >
        <div className="absolute size-3 border-l border-t border-primary/20 bg-white" style={arrow} />

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-lg">
              <TourIcon icon={step.icon} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-base font-extrabold text-slate-900 truncate">{step.title}</h3>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Paso {currentIndex + 1} de {totalSteps}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-5">{step.description}</p>

          {step.action && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <Lightbulb className="size-4 text-amber-600 shrink-0" /> {step.action.hint || "Realiza esta acción para continuar"}
              </p>
            </div>
          )}

          <div className="h-1.5 rounded-full bg-slate-100 mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-2"
              aria-label="Saltar tutorial"
            >
              Saltar
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={onPrev}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  aria-label="Paso anterior"
                >
                  Atrás
                </button>
              )}

              {isLast ? (
                <button
                  onClick={onFinish}
                  className="rounded-lg bg-gradient-to-r from-primary to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
                  aria-label="Finalizar tutorial"
                >
                  Finalizar
                </button>
              ) : (
                <button
                  onClick={onNext}
                  className="rounded-lg bg-gradient-to-r from-primary to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
                  aria-label="Siguiente paso"
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
