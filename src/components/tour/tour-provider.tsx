"use client"

import { TourProvider as ContextProvider } from "./tour-context"
import { TourOverlay } from "./tour-overlay"

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <ContextProvider>
      {children}
      <TourOverlay />
    </ContextProvider>
  )
}
