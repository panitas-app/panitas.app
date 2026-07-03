"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BookingFlow, type ServiceData, type BookingStoreData } from "@/components/booking/booking-flow"

export default function BookingPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [store, setStore] = useState<BookingStoreData | null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const [storeRes, servicesRes] = await Promise.all([
          fetch(`/api/stores/${slug}`),
          fetch(`/api/services?store=${slug}`),
        ])
        if (storeRes.ok) {
          const s = await storeRes.json()
          setStore({
            id: s.id,
            name: s.name,
            slug: s.slug,
            logo: s.logo,
            banner: s.banner,
            description: s.description,
            primaryColor: s.primaryColor || "#FFB92E",
            whatsapp: s.whatsapp,
            phone: s.phone,
            address: s.address,
            storeHours: s.storeHours,
          })
        }
        if (servicesRes.ok) {
          const svcs = await servicesRes.json()
          setServices(Array.isArray(svcs) ? svcs : [])
        }
      } catch {} finally { setLoading(false) }
    }
    init()
  }, [slug])

  useEffect(() => {
    if (store?.id) {
      fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, referrer: document.referrer || "" }),
      }).catch(() => {})
    }
  }, [store?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-sm font-semibold text-muted-foreground">Tienda no encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        <BookingFlow
          store={store}
          services={services}
          slug={slug}
          onComplete={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
      </div>
    </div>
  )
}
