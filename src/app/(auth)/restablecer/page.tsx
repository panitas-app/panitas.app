"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { Suspense } from "react"

function ResetPasswordForm() {
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
      setError("Ingresa el código de 6 dígitos")
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

  if (done) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md glass-dark rounded-3xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <CardTitle className="text-xl">Contraseña actualizada</CardTitle>
            <CardDescription>
              Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Button className="w-full rounded-xl" onClick={() => router.push("/?showLogin=1")}>
              Iniciar sesión
            </Button>
            <Link href="/">
              <Button variant="ghost" className="rounded-xl text-muted-foreground">
                <ArrowLeft className="size-4 mr-1" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md glass-dark rounded-3xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="size-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Restablecer contraseña</CardTitle>
          <CardDescription>
            Ingresa el código que recibiste por correo y tu nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="r-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Correo electrónico
              </label>
              <Input
                id="r-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                className="h-11 rounded-xl"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="r-code" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Código de verificación
              </label>
              <Input
                id="r-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                className="h-11 rounded-xl text-center text-lg tracking-[0.3em] font-mono"
                autoComplete="one-time-code"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="r-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <Input
                  id="r-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  className="h-11 rounded-xl pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="r-confirm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Confirmar contraseña
              </label>
              <Input
                id="r-confirm"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError("") }}
                className="h-11 rounded-xl"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                "Restablecer contraseña"
              )}
            </Button>

            <div className="flex justify-between text-sm">
              <Link href="/recuperar" className="text-muted-foreground hover:text-foreground transition-colors">
                Reenviar código
              </Link>
              <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5 mr-1" />
                Iniciar sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
