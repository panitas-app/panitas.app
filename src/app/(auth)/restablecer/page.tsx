"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Shield, Mail } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function RestablecerForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const emailParam = searchParams?.get("email")
    const tokenParam = searchParams?.get("token")
    if (emailParam) setEmail(emailParam)
    if (tokenParam) setCode(tokenParam)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Correo electrónico inválido")
      return
    }
    if (!code.trim()) {
      setError("Ingresa el código de verificación")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al restablecer")
        setLoading(false)
        return
      }

      setDone(true)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center px-4 py-12">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute top-1/2 -left-20 size-72 rounded-full bg-blue-400/[0.05] blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 size-64 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>

      {/* Back link */}
      <Link
        href="/recuperar"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#050505]/60 hover:text-[#050505] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Reenviar código
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {done ? (
          /* ─── Success State ─── */
          <div className="rounded-3xl glass-dark shadow-2xl p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200"
            >
              <CheckCircle2 className="size-8 text-emerald-500" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-extrabold text-[#050505]">
                ¡Contraseña actualizada!
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full h-11 rounded-xl shadow-lg shadow-primary/10"
                onClick={() => router.push("/?showLogin=1")}
              >
                Iniciar sesión
              </Button>
              <Link href="/">
                <Button variant="ghost" className="w-full rounded-xl text-muted-foreground">
                  <ArrowLeft className="size-4 mr-1" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* ─── Reset Form ─── */
          <div className="rounded-3xl glass-dark shadow-2xl p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 text-primary shadow-inner">
                <KeyRound className="size-8" />
              </div>

              <div className="space-y-1.5">
                <h1 className="font-heading text-2xl font-extrabold text-[#050505]">
                  Restablecer contraseña
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ingresa el código que recibiste por correo y tu nueva contraseña.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="rst-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="rst-email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Code */}
              <div className="space-y-2">
                <label htmlFor="rst-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Código de verificación
                </label>
                <Input
                  id="rst-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                  className="h-12 rounded-xl text-center text-xl tracking-[0.35em] font-mono font-bold"
                  autoComplete="one-time-code"
                />
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="rst-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="rst-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="rst-confirm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="rst-confirm"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10"
                    autoComplete="new-password"
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
                    Restableciendo...
                  </>
                ) : (
                  "Restablecer contraseña"
                )}
              </Button>
            </form>

            {/* Footer links */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/recuperar"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Reenviar código
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RestablecerForm />
    </Suspense>
  )
}
