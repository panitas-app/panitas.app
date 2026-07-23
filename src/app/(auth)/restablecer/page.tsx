"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Shield, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const glassStyle = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(0,0,0,0.06)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
}

const iconStyle = {
  background: "rgba(0,102,255,0.08)",
  border: "1px solid rgba(0,102,255,0.15)",
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04)",
  color: "#06f",
}

function RestablecerForm() {
  const router = useRouter()

  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      return params.get("email") ?? ""
    }
    return ""
  })
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      return params.get("token") ?? params.get("code") ?? ""
    }
    return ""
  })
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      {/* Logo top-left */}
      <Link href="/" className="absolute top-6 left-6 z-10">
        <Image src="/logonuevo.png" alt="Panitas" width={120} height={32} className="h-7 w-auto" priority />
      </Link>

      {/* Back link top-right */}
      <Link
        href="/recuperar"
        className="absolute top-6 right-6 z-10 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#050505]/60 hover:text-[#050505] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Reenviar código
      </Link>

      <div className="w-full max-w-md" style={{ animation: "fadeInUp 0.5s ease-out" }}>
        {done ? (
          <div className="rounded-3xl p-8 text-center space-y-6" style={glassStyle}>
            <div
              className="mx-auto flex size-16 items-center justify-center rounded-2xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-[#050505]" style={{ fontFamily: "'Polymath Display', Georgia, serif" }}>
                ¡Contraseña actualizada!
              </h1>
              <p className="text-sm text-[#6b7280] leading-relaxed">
                Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/10" onClick={() => router.push("/?showLogin=1")}>
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
          <div className="rounded-3xl p-8 space-y-6" style={glassStyle}>
            <div className="text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl" style={iconStyle}>
                <KeyRound className="size-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl font-extrabold text-[#050505]" style={{ fontFamily: "'Polymath Display', Georgia, serif" }}>
                  Restablecer contraseña
                </h1>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  Ingresa el código que recibiste por correo y tu nueva contraseña.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="rst-email" className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                  <Input id="rst-email" type="email" placeholder="correo@ejemplo.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }} className="h-11 rounded-xl pl-10" autoComplete="email" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="rst-code" className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                  Código de verificación
                </label>
                <Input id="rst-code" type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                  className="h-12 rounded-xl text-center text-xl tracking-[0.35em] font-mono font-bold" autoComplete="one-time-code" />
              </div>

              <div className="space-y-2">
                <label htmlFor="rst-password" className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                  <Input id="rst-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                    value={password} onChange={(e) => { setPassword(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10 pr-10" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#050505] transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="rst-confirm" className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#6b7280]" />
                  <Input id="rst-confirm" type="password" placeholder="Repite tu contraseña"
                    value={confirm} onChange={(e) => { setConfirm(e.target.value); setError("") }}
                    className="h-11 rounded-xl pl-10" autoComplete="new-password" />
                </div>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{error}</p>}

              <Button type="submit" className="w-full h-11 rounded-xl shadow-lg shadow-primary/10" disabled={loading}>
                {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Restableciendo...</> : "Restablecer contraseña"}
              </Button>
            </form>

            <div className="flex items-center justify-between pt-2">
              <Link href="/recuperar" className="text-sm text-[#6b7280] hover:text-[#050505] transition-colors">Reenviar código</Link>
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#050505] transition-colors">
                <ArrowLeft className="size-3.5" /> Iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="size-8 border-2 border-[#06f] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RestablecerForm />
    </Suspense>
  )
}