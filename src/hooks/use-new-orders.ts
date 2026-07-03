"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { playNotificationSound } from "@/lib/notification-sound"

const POLL_INTERVAL = 15000 // 15 seconds

export function useNewOrders() {
  const [newCount, setNewCount] = useState(0)
  const [lastTotal, setLastTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const soundPlayedRef = useRef(false)

  const checkOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/count")
      if (!res.ok) return
      const data = await res.json()

      if (data.total !== undefined) {
        if (lastTotal !== null && data.total > lastTotal && !soundPlayedRef.current) {
          playNotificationSound()
          soundPlayedRef.current = true
          setTimeout(() => { soundPlayedRef.current = false }, 3000)
        }
        setNewCount(data.total - (lastTotal ?? data.total))
        setLastTotal(data.total)
        setLoading(false)
      }
    } catch {}
  }, [lastTotal])

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
