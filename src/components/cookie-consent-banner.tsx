"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "panitas_cookies_accepted"

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY)
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-[#0A1628]/95 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-4 sm:flex-row sm:px-6">
            <div className="flex items-start gap-3 sm:flex-1">
              <Cookie className="mt-0.5 size-5 shrink-0 text-amber-300" />
              <p className="text-sm text-slate-300 leading-relaxed">
                Usamos cookies técnicas para que puedas iniciar sesión y gestionar tu tienda, y
                cookies de rendimiento (Google Analytics) para mejorar la plataforma. Al hacer clic
                en &quot;Aceptar&quot;, autorizas su uso. Puedes consultar nuestra{" "}
                <Link
                  href="/privacidad"
                  className="text-amber-300 underline hover:text-amber-200 transition-colors"
                >
                  Política de Privacidad y Cookies
                </Link>
                .
              </p>
            </div>
            <Button
              onClick={accept}
              className="shrink-0 rounded-xl px-6 font-semibold"
            >
              Aceptar
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
