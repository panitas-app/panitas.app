import Link from "next/link"
import { Lock } from "lucide-react"

export default function StorePlaceholder({ store }: { store: { name: string; logo?: string | null } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#102A43] to-slate-900 p-6">
      <div className="max-w-md text-center">
        <div className="inline-flex size-20 items-center justify-center rounded-3xl bg-white/10 mb-6">
          <Lock className="size-10 text-primary" />
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-white mb-4">
          {store.name}
        </h1>
        <p className="text-slate-300 text-lg mb-2">
          Esta tienda está en proceso de activación.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          El propietario está configurando su suscripción. Vuelve pronto para ver su catálogo completo.
        </p>
        <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-primary text-accent font-bold px-8 h-12 text-sm hover:brightness-105 transition-all">
          Ir a Panitas
        </Link>
      </div>
    </div>
  )
}
