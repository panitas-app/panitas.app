"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Clock, MapPin, Phone, Store, ChevronRight, Star, Calendar, MessageCircle, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ServiceData, BookingStoreData, PaymentAccountData } from "@/components/booking/booking-flow"

interface ProfileData {
  store: BookingStoreData
  services: ServiceData[]
  paymentAccounts: PaymentAccountData[]
}

export default function AgendaProfile({ slug }: { slug: string }) {
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/perfil/${slug}`)
        if (!res.ok) throw new Error()
        const json = await res.json()
        setData(json)
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-20 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white px-4">
        <Store className="size-12 text-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Perfil no disponible</h1>
        <p className="text-sm text-gray-500 text-center">El perfil que buscas no existe o ha sido desactivado.</p>
      </div>
    )
  }

  const { store, services } = data
  const accentColor = store.primaryColor || "#FFB92E"
  const whatsapp = store.whatsapp?.replace(/[^0-9]/g, "")
  const s = store as any
  const socialItems: { key: string; label: string; url: string }[] = []
  const socialFields = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "tiktok", label: "TikTok" },
    { key: "twitter", label: "Twitter / X" },
    { key: "youtube", label: "YouTube" },
    { key: "linkedin", label: "LinkedIn" },
  ]
  for (const f of socialFields) {
    if (s[f.key]) socialItems.push({ ...f, url: s[f.key] })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="h-32 sm:h-44 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {store.banner && (
          <img src={store.banner} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-14 relative z-10">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <div className="size-28 rounded-full bg-white p-1 shadow-lg mx-auto">
            <div className="size-full rounded-full bg-gray-100 overflow-hidden">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Store className="size-10 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          {store.description && (
            <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{store.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
            {services.length > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5" />
                {services.length} servicio{services.length !== 1 ? "s" : ""}
              </span>
            )}
            {store.address && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {store.address}
              </span>
            )}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex gap-3 mb-8"
        >
          <Button
            onClick={() => router.push(`/store/${slug}/booking`)}
            className="flex-1 rounded-xl py-5 text-sm font-bold shadow-sm"
            style={{ backgroundColor: accentColor, color: "#fff" }}
          >
            <Calendar className="size-4 mr-1.5" />
            Reservar cita
          </Button>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <MessageCircle className="size-5 text-green-500" />
            </a>
          )}
        </motion.div>

        {/* Social links */}
        {socialItems.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            {socialItems.map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={s.label}
              >
                <Globe className="size-5" />
              </a>
            ))}
          </motion.div>
        )}

        {/* Services section */}
        {services.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Servicios</h2>
            <div className="space-y-2">
              {services.map((svc, idx) => (
                <motion.button
                  key={svc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  onClick={() => router.push(`/store/${slug}/booking`)}
                  className="w-full text-left rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:shadow-sm transition-all flex items-center gap-4"
                >
                  {svc.image ? (
                    <div className="size-14 rounded-xl overflow-hidden shrink-0 bg-gray-50">
                      <img src={svc.image} alt={svc.name} className="size-full object-cover" />
                    </div>
                  ) : (
                    <div className="size-14 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <Clock className="size-6 text-gray-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                    {svc.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{svc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold" style={{ color: accentColor }}>
                        ${svc.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="size-3" />
                        {svc.durationMin} min
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-gray-300 shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Store info card */}
        {(store.phone || store.address || store.storeHours) && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 mb-8"
          >
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Información</h3>
            <div className="space-y-2">
              {store.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="size-4 text-gray-400" />
                  {store.phone}
                </div>
              )}
              {store.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="size-4 text-gray-400" />
                  {store.address}
                </div>
              )}
              {store.storeHours && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Clock className="size-4 text-gray-400 mt-0.5" />
                  <span>Horarios disponibles al reservar</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-300 pb-8">
          Powered by Panitas
        </p>
      </div>
    </div>
  )
}
