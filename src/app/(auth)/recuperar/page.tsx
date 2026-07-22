"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresa un correo electrónico válido")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok && data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #eff6ff 100%)" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-[#06f] opacity-[0.04] blur-3xl" />
        <div className="absolute top-1/3 -right-20 size-72 rounded-full bg-[#3b82f6] opacity-[0.05] blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-64 rounded-full bg-[#06f] opacity-[0.03] blur-3xl" />
      </div>

      {/* Logo in top-left */}
      <Link href="/" className="absolute top-6 left-6 z-10">
        <Image
          src="/logonuevo.png"
          alt="Panitas"
          width={120}
          height={32}
          className="h-7 w-auto"
          priority
        />
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {sent ? (
          /* ─── Sent State ─── */
          <div
            className="rounded-3xl p-8 text-center space-y-6"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto flex size-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <CheckCircle2 className="size-8 text-emerald-500" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-[#050505]" style={{ fontFamily: "'Polymath Display', Georgia, serif" }}>
                ¡Correo enviado!
              </h1>
              <p className="text-sm text-[#6b7280] leading-relaxed">
                Si existe una cuenta con <strong className="text-[#050505]">{email}</strong>, recibirás un código de 6 dígitos.
                Revisa también tu carpeta de spam.
              </p>
            </div>

            <div
              className="rounded-2xl p-4 text-left"
              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
            >
              <p className="text-xs text-amber-700 leading-relaxed">
                El código expira en <strong>15 minutos</strong>. Una vez que lo tengas, puedes restablecer tu contraseña en la siguiente página.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link href={`/restablecer?email=${encodeURIComponent(email.trim().toLowerCase())}`}>
                <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/10">
                  Ir a restablecer
                  <ArrowLeft className="size-4 ml-2 rotate-180" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full rounded-xl text-muted-foreground"
                onClick={() => { setSent(false); setEmail("") }}
              >
                Usar otro correo
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Form State ─── */
          <div
            className="rounded-3xl p-8 space-y-6"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            {/* Icon */}
            <div className="text-center space-y-4">
              <div
                className="mx-auto flex size-16 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(0,102,255,0.08)",
                  border: "1px solid rgba(0,102,255,0.15)",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04)",
                  color: "#06f",
                }}
              >
                <ShieldCheck className="size-8" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl font-extrabold text-[#050505]" style={{ fontFamily: "'Polymath Display', Georgia, serif" }}>
                  Recuperar contraseña
                </h1>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="rec-email" className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                  <Input
                    id="rec-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full h-11 rounded-xl shadow-lg shadow-primary/10" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  "Enviar código de recuperación"
                )}
              </Button>
            </form>

            {/* Footer link */}
            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#050505] transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
