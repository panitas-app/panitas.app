"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, ArrowLeft, UserPlus, Globe, Mail, Lock, Loader2 } from "lucide-react"
import { Toaster, toast } from "sonner"

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface SessionData {
  user?: SessionUser
}

export default function RegisterContent({ session, plan: selectedPlan }: { session: SessionData | null; plan?: string }) {
  const router = useRouter()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      router.push("/dashboard")
    }
  }, [session, router])

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, plan: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al registrarse")
        return
      }
      toast.success("Cuenta creada. Iniciando sesión...")
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (signInResult?.error) {
        toast.error("Cuenta creada, pero no se pudo iniciar sesión. Ve al login e ingresa manualmente.")
        router.push("/")
      } else if (signInResult?.url) {
        router.push(signInResult.url)
      } else {
        router.push("/choose-plan")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="animate-spin size-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row bg-white overflow-hidden">
      <Toaster richColors position="top-center" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 z-0 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-20 right-[30%] z-0 size-80 rounded-full bg-linear-to-tr from-indigo-500/5 to-purple-500/5 blur-3xl" />

      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-primary/5 via-primary/[0.02] to-white p-12 text-[#050505] md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <Link href="/" className="relative z-10 block w-32">
          <img src="/logonuevo.png" alt="Panitas" className="w-full h-auto opacity-80 hover:opacity-100 transition-opacity" style={{ filter: "invert(1)" }} />
        </Link>

        <div className="relative z-10 space-y-8 my-auto">
          <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Tu tienda profesional al estilo Shopify en minutos.
          </h2>

          <p className="text-[#050505]/80 text-base max-w-md">
            Registra tu cuenta con correo y contraseña o con tu cuenta de Google. Sin comisiones y adaptado a los métodos de pago en Venezuela.
          </p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl glass-dark p-5 shadow-2xl max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Globe className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dirección Web Inmediata</p>
                <p className="text-lg font-bold text-[#050505]">panitas.app/tutienda</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-muted-foreground">
          Hecho en Venezuela con ❤️ para todos los emprendedores.
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 md:p-12 z-10">
        <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#050505]/60 hover:text-[#050505] transition-colors md:hidden">
          <ArrowLeft className="size-3.5" /> Volver
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl glass-dark shadow-2xl">
            <CardHeader className="text-center space-y-2 pb-6 pt-8">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <UserPlus className="size-6" />
              </div>
              <CardTitle className="font-heading text-2xl font-extrabold text-[#050505]">Crear Cuenta</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Elige cómo quieres registrarte
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-6">
              {/* Email + Password Form */}
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre</Label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 rounded-xl bg-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 rounded-xl bg-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 rounded-xl bg-white"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className="w-full rounded-xl bg-primary font-black text-accent h-12 shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 text-muted-foreground">O continúa con</span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                disabled={!acceptedTerms}
                className="w-full rounded-xl bg-white font-black text-[#050505]/80 h-12 shadow-sm transition-all duration-300 hover:bg-muted active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-wider uppercase"
                onClick={() => signIn("google", { callbackUrl: "/choose-plan" })}
              >
                <svg className="h-5 w-5" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Registrarme con Google
              </Button>

              <div className="mt-6 flex items-start gap-3">
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={(val) => setAcceptedTerms(val === true)}
                  className="mt-0.5"
                  aria-label="Aceptar términos y condiciones"
                />
                <label className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                  He leído y acepto los{" "}
                  <Link href="/terminos" className="text-primary underline hover:text-primary/80">
                    Términos y Condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="text-primary underline hover:text-primary/80">
                    Política de Privacidad y Cookies
                  </Link>{" "}
                  de Panitas.
                </label>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
