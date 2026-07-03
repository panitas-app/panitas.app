"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface BcvRateContextValue {
  rate: number
  setRate: (rate: number) => void
}

const BcvRateContext = createContext<BcvRateContextValue | null>(null)

export function BcvRateProvider({ initialRate, children }: { initialRate: number; children: ReactNode }) {
  const [rate, setRate] = useState(initialRate)
  return <BcvRateContext.Provider value={{ rate, setRate }}>{children}</BcvRateContext.Provider>
}

export function useBcvRate() {
  const ctx = useContext(BcvRateContext)
  if (!ctx) throw new Error("useBcvRate must be used within BcvRateProvider")
  return ctx
}
