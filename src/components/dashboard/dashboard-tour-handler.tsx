"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TourProvider, useTour } from "@/components/tour/tour-context"

export function TourAutoStarter({ planType }: { planType: string }) {
  const startedRef = useRef(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const tour = useTour()

  const checkAndStart = useCallback(async () => {
    if (startedRef.current) return
    const shouldStart = searchParams.get("tour") === "true"

    if (!shouldStart) return
    startedRef.current = true

    // Remove tour param from URL
    const url = new URL(window.location.href)
    url.searchParams.delete("tour")
    router.replace(url.pathname + url.search, { scroll: false })

    try {
      const res = await fetch("/api/tour/status")
      const data = await res.json()
      if (data.completed) return
    } catch {}

    // Small delay for DOM to be ready
    setTimeout(() => tour.start(planType), 500)
  }, [planType, searchParams, router, tour])

  useEffect(() => { checkAndStart() }, [checkAndStart])

  return null
}

export function DashboardTourHandler({
  planType,
  children,
}: {
  planType: string
  children: React.ReactNode
}) {
  return (
    <TourProvider>
      <div data-plan-type={planType}>
        <TourAutoStarter planType={planType} />
        {children}
      </div>
    </TourProvider>
  )
}
