"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Store } from "lucide-react"
import { toast } from "sonner"

export default function SellerLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) return toast.error("Completa todos los campos")
    setLoading(true)
    try {
      const res = await fetch("/api/seller/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al iniciar sesión")
      }
      toast.success("Sesión iniciada")
      router.push("/seller/panel")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] to-[#1A2D4A] p-4">
      <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/20">
            <Store className="size-7 text-primary" />
          </div>
          <CardTitle className="text-white text-xl">Panel de Vendedor</CardTitle>
          <p className="text-sm text-slate-400">Ingresa con tus credenciales</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Usuario</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                className="bg-white/10 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="bg-white/10 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
