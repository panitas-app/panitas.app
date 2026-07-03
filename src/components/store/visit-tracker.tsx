"use client"

import { useEffect } from "react"

interface Props {
  storeId: string
}

export function VisitTracker({ storeId }: Props) {
  useEffect(() => {
    const referrer = document.referrer || ""
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, referrer }),
    }).catch(() => {})
  }, [storeId])

  return null
}
