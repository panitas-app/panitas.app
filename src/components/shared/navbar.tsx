"use client"

import { useState, useEffect, useRef } from "react"
import { Menu, X, Star } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

const overlayEasing = [0.76, 0, 0.24, 1] as const

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const hasScrolled = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (id: string) => {
    if (transitioning) return
    setOpen(false)
    setTargetId(id)
    hasScrolled.current = false
    setTransitioning(true)
    setShowOverlay(true)
  }

  const onOverlayComplete = () => {
    if (!hasScrolled.current && targetId) {
      const el = document.getElementById(targetId)
      if (el) {
        const offset = 80
        const top = el.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: "instant" })
      }
      hasScrolled.current = true
    }
    if (hasScrolled.current) {
      setShowOverlay(false)
      setTransitioning(false)
      setTargetId(null)
    }
  }

  return (
    <>
      {/* Page Transition Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="page-overlay"
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.55, ease: overlayEasing }}
            onAnimationComplete={onOverlayComplete}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#102A43]"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="relative flex size-16 items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="" className="size-full object-contain" />
              </span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.25, duration: 0.4, ease: "easeOut" }}
                className="h-[2px] w-24 origin-left bg-primary/60 rounded-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full py-4 px-4 md:px-8" style={{ "--accent": "#102A43" } as React.CSSProperties}>
        <div className="absolute inset-0 bg-[#FFB92E]/85 backdrop-blur-2xl border-b border-white/20 shadow-lg shadow-black/5" />

        <motion.div
          animate={{
            maxWidth: scrolled ? 1024 : 1280,
            borderRadius: scrolled ? 9999 : 0,
            background: "transparent",
            boxShadow: scrolled
              ? "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
              : "0 0 0 0 rgba(0,0,0,0)",
            paddingLeft: scrolled ? 24 : 0,
            paddingRight: scrolled ? 24 : 0,
            paddingTop: scrolled ? 8 : 0,
            paddingBottom: scrolled ? 8 : 0,
            borderWidth: scrolled ? 1 : 0,
            borderColor: scrolled ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0)",
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex items-center justify-between h-14"
        >
          {/* Logo */}
          <Link href="/" className="group flex items-center">
            <span className="relative flex h-28 w-auto items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.png" alt="Panitas" className="h-full w-auto object-contain" />
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-wider text-accent/80 md:flex">
            <Link
              href="/"
              className="relative py-1.5 transition-colors duration-300 hover:text-accent group"
            >
              Inicio
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </Link>
            <button
              onClick={() => scrollToSection("caracteristicas")}
              className="relative py-1.5 transition-colors duration-300 hover:text-accent group cursor-pointer"
            >
              Características
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </button>
            <button
              onClick={() => scrollToSection("precios")}
              className="relative py-1.5 transition-colors duration-300 hover:text-accent group cursor-pointer"
            >
              Precios
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 md:flex">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-wider text-accent/80 transition-all duration-300 hover:text-accent hover:bg-accent/5 rounded-full px-5 py-2.5"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="relative overflow-hidden inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary shadow-md shadow-accent/15 transition-all duration-300 hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/20 active:scale-[0.97]"
            >
              Crear tienda
              <Star className="size-3 fill-current text-primary" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-center rounded-full p-2 text-accent/80 transition-all duration-300 hover:bg-accent/10 md:hidden"
            aria-label="Menú"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </motion.div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full md:hidden"
            >
              <nav className="mx-4 mt-2 rounded-2xl bg-[#FFB92E]/95 backdrop-blur-md border border-accent/10 p-6 shadow-2xl">
                <div className="flex flex-col gap-3">
                  <Link href="/" onClick={() => setOpen(false)} className="text-sm font-bold text-accent/80 hover:text-accent py-2">Inicio</Link>
                  <button onClick={() => scrollToSection("caracteristicas")} className="text-sm font-bold text-accent/80 hover:text-accent py-2 text-left cursor-pointer">Características</button>
                  <button onClick={() => scrollToSection("precios")} className="text-sm font-bold text-accent/80 hover:text-accent py-2 text-left cursor-pointer">Precios</button>
                </div>
                <div className="mt-4 flex flex-col gap-3 pt-4 border-t border-accent/10">
                  <div className="flex justify-center">
                    <ThemeToggle />
                  </div>
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-full border border-accent/20 px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent/80 transition-all duration-300 hover:bg-accent/5">
                    Entrar al Sistema
                  </Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="rounded-full bg-accent px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-primary shadow-md shadow-accent/10 transition-all duration-300 hover:bg-accent/90">
                    Crear mi tienda gratis
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}
