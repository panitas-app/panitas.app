"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { signIn, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import { Sparkles, TrendingUp, ArrowLeft, LogIn, AlertCircle } from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "Este correo ya está registrado con otro método de inicio de sesión. Intenta con otro método.",
  OAuthCallback: "Hubo un error al conectar con Google. Intenta de nuevo.",
  OAuthSignin: "Error al iniciar con Google. Intenta de nuevo.",
  OAuthCreateAccount: "No se pudo crear la cuenta con Google.",
  AccessDenied: "Acceso denegado.",
  Configuration: "Error de configuración del servidor. Contacta a soporte.",
  CredentialsSignin: "Credenciales inválidas.",
  default: "Error al iniciar sesión. Intenta de nuevo.",
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const err = searchParams.get("error")
    if (err) {
      setError(ERROR_MESSAGES[err] || ERROR_MESSAGES.default)
    }
  }, [searchParams])

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row bg-slate-50/50 dark:bg-slate-950 overflow-hidden">
      <div className="pointer-events-none absolute -bottom-20 -right-20 z-0 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-20 right-[30%] z-0 size-80 rounded-full bg-linear-to-tr from-indigo-500/5 to-purple-500/5 blur-3xl animate-pulse" />

      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-b from-[#102A43] via-[#102A43] to-slate-900 p-12 text-white md:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <Link href="/" className="relative z-10 flex items-center gap-2.5 font-heading text-lg font-bold tracking-wider text-white group">
          <span className="relative flex size-8 items-center justify-center rounded-lg bg-primary">
            <img src="/favicon.jpg" alt="Panitas" className="size-5 object-contain" />
          </span>
          PANITAS
        </Link>

        <div className="relative z-10 space-y-8 my-auto">
          <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="mr-1.5 size-3.5 fill-current text-primary animate-pulse" />
            Vuelve a tu Centro de Negocios
          </Badge>
          
          <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Controla tu catálogo e impulsa tus ventas.
          </h2>
          
          <p className="text-slate-300 text-base max-w-md">
            Ingresa a tu cuenta para gestionar productos, confirmar pagos y configurar tu tasa de cambio del día.
          </p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-md max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total transacciones procesadas</p>
                <p className="text-lg font-bold text-white">+Bs. 1.2M en Pago Móvil</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          Hecho en Venezuela con ❤️ para todos los emprendedores.
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 md:p-12 z-10">
        <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors md:hidden">
          <ArrowLeft className="size-3.5" /> Volver
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <Card className="rounded-3xl border border-white/60 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 shadow-2xl backdrop-blur-md">
            <CardHeader className="text-center space-y-2 pb-6 pt-8">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <LogIn className="size-6" />
              </div>
              <CardTitle className="font-heading text-2xl font-extrabold text-accent">Iniciar Sesión</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">Accede de inmediato con tu cuenta de Google</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              {error && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                size="lg"
                className="w-full rounded-xl bg-primary text-accent font-bold hover:brightness-105 shadow-md shadow-primary/10 h-12 text-base"
                onClick={async () => {
                  setLoading(true)
                  await signOut({ redirect: false }).finally(() => {
                    signIn("google", { callbackUrl: "/dashboard" })
                  })
                }}
                disabled={loading}
              >
                <svg className="mr-2.5 size-5" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                {loading ? "Conectando..." : "Continuar con Google"}
              </Button>

              <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Regístrate gratis
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
