"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Shield, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const secretFromUrl = searchParams.get("secret")
  const [inputSecret, setInputSecret] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(!!secretFromUrl)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    if (secretFromUrl) {
      authenticate(secretFromUrl)
    }
  }, [secretFromUrl])

  async function authenticate(secret: string) {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al autenticar")
        setLoading(false)
        return
      }
      router.push("/admin")
    } catch {
      setError("Error de conexión")
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputSecret.trim()) return
    authenticate(inputSecret.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-xl p-8 shadow-xl ring-1 ring-border/20">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Shield className="size-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Ingresa la clave de acceso</p>
        </div>
        {loading ? (
          <div className="text-center py-10">
            <div className="mx-auto size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground mt-4">Autenticando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clave secreta</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type={showSecret ? "text" : "password"}
                  placeholder="ADMIN_SECRET"
                  value={inputSecret}
                  onChange={(e) => setInputSecret(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background/70 backdrop-blur-xl pl-10 pr-10 text-sm text-foreground tracking-widest outline-none transition-all placeholder:text-muted-foreground/40 placeholder:tracking-normal focus:border-ring focus:ring-3 focus:ring-ring/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                >
                  {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}
            <Button type="submit" disabled={!inputSecret.trim()} className="w-full h-11 text-sm font-semibold">
              Acceder
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="mx-auto size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
