"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface BcvRateContextValue {
  rate: number
  setRate: (rate: number) => void
  showBolivares: boolean
  setShowBolivares: (v: boolean) => void
}

const BcvRateContext = createContext<BcvRateContextValue | null>(null)

export function BcvRateProvider({ initialRate, initialShowBolivares = true, children }: { initialRate: number; initialShowBolivares?: boolean; children: ReactNode }) {
  const [rate, setRate] = useState(initialRate)
  const [showBolivares, setShowBolivares] = useState(initialShowBolivares)

  useEffect(() => { setRate(initialRate) }, [initialRate])
  useEffect(() => { setShowBolivares(initialShowBolivares) }, [initialShowBolivares])

  return <BcvRateContext.Provider value={{ rate, setRate, showBolivares, setShowBolivares }}>{children}</BcvRateContext.Provider>
}

export function useBcvRate() {
  const ctx = useContext(BcvRateContext)
  if (!ctx) throw new Error("useBcvRate must be used within BcvRateProvider")
  return ctx
}
