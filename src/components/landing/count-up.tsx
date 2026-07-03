"use client"

import { useRef, useEffect, useState } from "react"

interface Props {
  value: string
  duration?: number
}

export function CountUp({ value, duration = 2 }: Props) {
  const [display, setDisplay] = useState("0")
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          observer.disconnect()

          const numMatch = value.match(/[\d.]+/)
          if (!numMatch) { setDisplay(value); return }

          const target = parseFloat(numMatch[0])
          const prefix = value.slice(0, value.indexOf(numMatch[0]))
          const suffix = value.slice(value.indexOf(numMatch[0]) + numMatch[0].length)
          const isDecimal = numMatch[0].includes(".")
          const decimals = isDecimal ? numMatch[0].split(".")[1].length : 0

          let startTime: number | null = null
          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const elapsed = (timestamp - startTime) / 1000
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const current = target * eased
            setDisplay(prefix + current.toFixed(decimals) + suffix)
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return <span ref={ref}>{display}</span>
}
