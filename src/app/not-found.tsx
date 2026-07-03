import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50 px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-black text-primary/20 select-none">404</div>
        <h1 className="font-heading text-3xl font-bold text-[#102A43]">Página no encontrada</h1>
        <p className="text-muted-foreground">
          La página que buscas no existe, fue movida o el enlace no es correcto.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline">Ir al inicio</Button>
          </Link>
          <Link href="/pricing">
            <Button>Ver planes</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
