import Link from "next/link"
import { CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  searchParams?: Promise<{ verified?: string; error?: string }>
}

export default async function OnboardingPage(props: Props) {
  const searchParams = await props?.searchParams
  const verified = searchParams?.verified === "true"
  const error = searchParams?.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 px-4">
      <div className="w-full max-w-md text-center">
        {verified ? (
          <>
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-8 text-green-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[#050505]">Correo verificado</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              Tu correo electrónico ha sido verificado exitosamente. Ya puedes acceder a todas las funciones de tu cuenta.
            </p>
            <Link href="/dashboard/settings?tab=verification">
              <Button className="w-full">
                Ir a mi cuenta
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </>
        ) : error === "invalid_token" ? (
          <>
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="size-8 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[#050505]">Enlace inválido</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              El enlace de verificación no es válido o ha expirado. Solicita un nuevo código desde la configuración de tu cuenta.
            </p>
            <Link href="/dashboard/settings?tab=verification">
              <Button className="w-full">
                Ir a configuración
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </>
        ) : error === "missing_token" ? (
          <>
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-amber-100">
              <XCircle className="size-8 text-amber-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[#050505]">Falta el token</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              No se encontró el token de verificación en el enlace. Usa el código enviado a tu correo.
            </p>
            <Link href="/dashboard/settings?tab=verification">
              <Button className="w-full">
                Ir a configuración
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="size-8 text-blue-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-[#050505]">Bienvenido a Panitas</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              Verifica tu correo electrónico desde la configuración para asegurar tu cuenta.
            </p>
            <Link href="/dashboard/settings?tab=verification">
              <Button className="w-full">
                Verificar mi correo
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}