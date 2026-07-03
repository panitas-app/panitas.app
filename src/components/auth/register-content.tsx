"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { Sparkles, ArrowLeft, UserPlus, Globe } from "lucide-react"

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface SessionData {
  user?: SessionUser
}

export default function RegisterContent({ session }: { session: SessionData | null }) {
  const router = useRouter()
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    if (session) {
      router.push("/onboarding")
    }
  }, [session, router])

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#102A43] to-slate-900">
        <div className="animate-spin size-8 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

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
            E-Commerce en 1 Clic
          </Badge>
          
          <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Tu tienda profesional al estilo Shopify en minutos.
          </h2>
          
          <p className="text-slate-300 text-base max-w-md">
            Registra tu cuenta de forma 100% segura usando tu cuenta de Google. Sin comisiones y adaptado a los métodos de pago en Venezuela.
          </p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-md max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Globe className="size-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Dirección Web Inmediata</p>
                <p className="text-lg font-bold text-white">panitas.app/tutienda</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-slate-400">
          Hecho en Venezuela con ❤️ para todos los emprendedores.
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 md:p-12 z-10">
        <Link href="/" className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden">
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
                <UserPlus className="size-6" />
              </div>
              <CardTitle className="font-heading text-2xl font-extrabold text-accent">Crear Cuenta</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Conéctate de forma rápida y segura con Google
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
                Para garantizar la máxima seguridad y simplificar el acceso a tu panel de ventas de Panitas, el registro es exclusivo a través de Google.
              </p>

              <Button
                variant="outline"
                type="button"
                disabled={!acceptedTerms}
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-black text-slate-700 dark:text-slate-300 h-12 shadow-sm transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-wider uppercase"
                onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
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
                <label className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed cursor-pointer select-none">
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
