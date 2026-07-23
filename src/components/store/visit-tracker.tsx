"use client"

import { useEffect } from "react"

interface Props {
  storeId: string
}

export function VisitTracker({ storeId }: Props) {
  useEffect(() => {
    const referrer = document.referrer || ""
    const params = new URLSearchParams(window.location.search)
    const ref =
      params.get("ref") ||
      params.get("utm_source") ||
      params.get("source") ||
      ""
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, referrer, ref }),
    }).catch(() => {})
  }, [storeId])

  return null
}