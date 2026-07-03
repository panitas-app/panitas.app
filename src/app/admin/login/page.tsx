"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const secretFromUrl = searchParams.get("secret")
  const [inputSecret, setInputSecret] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(!!secretFromUrl)

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#102A43]">Panel de Administración</h1>
          <p className="text-gray-500 mt-1">Ingresa la clave de acceso</p>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#184BBF] border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-3">Autenticando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="ADMIN_SECRET"
                value={inputSecret}
                onChange={(e) => setInputSecret(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184BBF] text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={!inputSecret.trim()}
              className="w-full bg-[#184BBF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Acceder
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-yellow-50">
        <div className="animate-spin h-8 w-8 border-4 border-[#184BBF] border-t-transparent rounded-full mx-auto" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
