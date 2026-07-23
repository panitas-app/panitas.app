"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { playNotificationSound } from "@/lib/notification-sound"

const POLL_INTERVAL = 15000 // 15 seconds

export function useNewOrders() {
  const [newCount, setNewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const lastTotalRef = useRef<number | null>(null)
  const soundPlayedRef = useRef(false)

  const checkOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/count?excludePos=true")
      if (!res.ok) return
      const data = await res.json()

      if (data.total !== undefined) {
        const prev = lastTotalRef.current
        if (prev !== null && data.total > prev && !soundPlayedRef.current) {
          playNotificationSound()
          soundPlayedRef.current = true
          setTimeout(() => { soundPlayedRef.current = false }, 3000)
        }
        setNewCount(data.total - (prev ?? data.total))
        lastTotalRef.current = data.total
        setLoading(false)
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }, [])

  useEffect(() => {
    checkOrders()
    const interval = setInterval(checkOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkOrders])

  const resetCount = useCallback(() => {
    setNewCount(0)
  }, [])

  return { newCount, loading, resetCount }
}
