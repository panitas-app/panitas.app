"use client"

import { useState } from "react"
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

export default function ForgotPasswordContent() {
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

  if (sent) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <Card className="w-full max-w-md glass-dark rounded-3xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="size-7 text-emerald-500" />
            </div>
            <CardTitle className="text-xl">Correo enviado</CardTitle>
            <CardDescription>
              Si existe una cuenta con <strong>{email}</strong>, recibirás un código de 6 dígitos en tu bandeja de entrada.
              Revisa también tu carpeta de spam.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              El código expira en 15 minutos. Una vez que lo tengas, puedes restablecer tu contraseña.
            </p>
            <div className="flex flex-col gap-2">
              <Button className="w-full rounded-xl" onClick={() => setSent(false)}>
                Usar otro correo
              </Button>
              <Link href="/">
                <Button variant="ghost" className="rounded-xl text-muted-foreground">
                  <ArrowLeft className="size-4 mr-1" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
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
            <Mail className="size-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                className="h-11 rounded-xl"
                autoFocus
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Enviando código...
                </>
              ) : (
                "Enviar código"
              )}
            </Button>

            <div className="text-center">
              <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="size-3.5 mr-1" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
