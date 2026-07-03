"use client"

import { ReactNode } from "react"
import { PlanUpgradeBanner } from "./plan-upgrade-banner"

interface UpgradeBannerWrapperProps {
  planId: string | null
  modalidad: string | null
  children: ReactNode
}

export function UpgradeBannerWrapper({ planId, modalidad, children }: UpgradeBannerWrapperProps) {
  return (
    <div className="space-y-4">
      {planId && (
        <PlanUpgradeBanner planId={planId} modalidad={modalidad} />
      )}
      {children}
    </div>
  )
}
