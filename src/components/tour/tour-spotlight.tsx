"use client"

import { useEffect } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"

interface Props {
  targetRect: DOMRect | null
  isActive: boolean
  padding?: number
}

export function TourSpotlight({ targetRect, isActive, padding = 16 }: Props) {
  const o = useMotionValue(0)
  const pulse = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const w = useMotionValue(0)
  const h = useMotionValue(0)

  const pulseScale = useTransform(pulse, [0.95, 1.02], [1, 1.03])
  const glowOpacity = useTransform(pulse, [0.95, 1.02], [0.3, 0.7])

  const topH = useTransform(y, (v: number) => Math.max(0, v))
  const bottomTop = useTransform([y, h], ([yv, hv]: number[]) => yv + hv)
  const leftW = useTransform(x, (v: number) => Math.max(0, v))
  const rightLeft = useTransform([x, w], ([xv, wv]: number[]) => xv + wv)
  const rightW = useTransform([x, w], ([xv, wv]: number[]) => Math.max(0, window.innerWidth - xv - wv))
  const sideH = useTransform(h, (v: number) => v)
  const borderLeft = useTransform(x, (v: number) => v - 2)
  const borderTop = useTransform(y, (v: number) => v - 2)
  const borderWidth = useTransform(w, (v: number) => v + 4)
  const borderHeight = useTransform(h, (v: number) => v + 4)

  useEffect(() => {
    if (!isActive || !targetRect) {
      animate(o, 0, { duration: 0.2 })
      return
    }

    const px = padding
    animate(x, targetRect.left - px, { type: "spring", stiffness: 250, damping: 25 })
    animate(y, targetRect.top - px, { type: "spring", stiffness: 250, damping: 25 })
    animate(w, targetRect.width + px * 2, { type: "spring", stiffness: 250, damping: 25 })
    animate(h, targetRect.height + px * 2, { type: "spring", stiffness: 250, damping: 25 })
    animate(o, 1, { duration: 0.35, ease: [0.16, 1, 0.3, 1] })

    const pulseAnim = animate(pulse, [1, 1.04, 1], {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    })
    return () => pulseAnim.stop()
  }, [targetRect, isActive, padding])

  if (!isActive || !targetRect) return null

  return (
    <motion.div className="fixed inset-0 z-[9998] pointer-events-none" style={{ opacity: o }}>
      <motion.div className="absolute left-0 right-0 top-0 bg-black/60" style={{ height: topH }} />
      <motion.div className="absolute left-0 right-0 bottom-0 bg-black/60" style={{ top: bottomTop }} />
      <motion.div className="absolute bottom-0 bg-black/60" style={{ left: 0, top: y, width: leftW, height: sideH }} />
      <motion.div className="absolute bottom-0 bg-black/60" style={{ left: rightLeft, top: y, width: rightW, height: sideH }} />

      <motion.div
        className="absolute rounded-2xl pointer-events-none"
        style={{ left: x, top: y, width: w, height: h, opacity: glowOpacity }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      </motion.div>

      <motion.div
        className="absolute rounded-2xl border-2 border-primary/60 shadow-2xl pointer-events-none"
        style={{
          left: borderLeft,
          top: borderTop,
          width: borderWidth,
          height: borderHeight,
          scale: pulseScale,
          boxShadow: "0 0 0 2px rgba(59,130,246,0.12), 0 0 50px 8px rgba(59,130,246,0.12)",
        }}
      />
    </motion.div>
  )
}
