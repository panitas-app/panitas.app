"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

type Status = "loading" | "valid" | "expired" | "used" | "wrong-email" | "already-member" | "success" | "error"

export function JoinContent({ token, isLoggedIn }: { token: string; isLoggedIn: boolean }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("loading")
  const [storeName, setStoreName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMsg("No se proporcionó un token de invitación")
      return
    }

    if (!isLoggedIn) {
      setStatus("error")
      setErrorMsg("Debes iniciar sesión primero")
      return
    }

    async function acceptInvite() {
      try {
        const res = await fetch("/api/stores/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (res.ok) {
          setStatus("success")
          setStoreName(data.store?.name || "")
        } else if (res.status === 403 && data.error?.includes("iniciar sesión con esa cuenta")) {
          setStatus("wrong-email")
          setErrorMsg(data.error)
        } else if (data.error?.includes("expirado")) {
          setStatus("expired")
        } else if (data.error?.includes("ya fue aceptada")) {
          setStatus("used")
        } else if (data.error?.includes("ya eres miembro")) {
          setStatus("already-member")
          setStoreName("")
        } else {
          setStatus("error")
          setErrorMsg(data.error || "Error al aceptar invitación")
        }
      } catch {
        setStatus("error")
        setErrorMsg("Error de conexión")
      }
    }

    acceptInvite()
  }, [token, isLoggedIn])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-50 p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">
            {status === "loading" && "Verificando invitación..."}
            {status === "valid" && "Invitación válida"}
            {status === "success" && "¡Bienvenido al equipo!"}
            {status === "expired" && "Invitación expirada"}
            {status === "used" && "Invitación ya utilizada"}
            {status === "wrong-email" && "Correo incorrecto"}
            {status === "already-member" && "Ya eres miembro"}
            {status === "error" && "Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Procesando tu invitación..."}
            {status === "success" && `Has sido agregado al equipo de ${storeName}`}
            {status === "expired" && "Esta invitación ha expirado. Pídele al administrador que te envíe una nueva."}
            {status === "used" && "Esta invitación ya fue aceptada por otro usuario."}
            {status === "wrong-email" && errorMsg}
            {status === "already-member" && "Ya tienes acceso a esta tienda."}
            {status === "error" && (errorMsg || "No se pudo procesar la invitación.")}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex justify-center pb-6">
          {status === "loading" && <Loader2 className="size-16 animate-spin text-primary" />}
          {status === "success" && <CheckCircle className="size-16 text-emerald-500" />}
          {(status === "expired" || status === "used" || status === "error") && <XCircle className="size-16 text-red-400" />}
          {status === "wrong-email" && <XCircle className="size-16 text-amber-400" />}
          {status === "already-member" && <CheckCircle className="size-16 text-blue-500" />}
        </CardContent>

        <CardFooter className="flex justify-center gap-3">
          {status === "success" && (
            <Button onClick={() => router.push("/dashboard")} className="gap-2">
              Ir al dashboard <ArrowRight className="size-4" />
            </Button>
          )}
          {(status === "already-member") && (
            <Button onClick={() => router.push("/dashboard")} className="gap-2">
              Ir al dashboard <ArrowRight className="size-4" />
            </Button>
          )}
          {!isLoggedIn && (
            <Link href={`/login?callbackUrl=/join?token=${token}`}>
              <Button>Iniciar sesión</Button>
            </Link>
          )}
          {(status === "expired" || status === "error" || status === "used" || status === "wrong-email") && (
            <Button variant="outline" onClick={() => router.push("/login")}>
              Volver al inicio
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
