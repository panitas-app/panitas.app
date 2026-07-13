"use client"

import { useState, useRef, useEffect } from "react"
import { Phone, CheckCircle, Loader2, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Props {
  initialPhone?: string | null
  initialVerified: boolean
}

export function SettingsPhone({ initialPhone, initialVerified }: Props) {
  const [phone, setPhone] = useState(initialPhone || "")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">(
    initialVerified ? "verified" : "idle"
  )
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [cooldown])

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Ingresa un número de teléfono válido")
      return
    }
    setStep("sending")
    try {
      const res = await fetch("/api/auth/send-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al enviar código" }))
        toast.error(err.error)
        setStep("idle")
        return
      }
      setStep("sent")
      setCooldown(60)
      toast.success("Código enviado por SMS")
    } catch {
      toast.error("Error de conexión")
      setStep("idle")
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(0, 1)
    setCode(newCode)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const fullCode = code.join("")
    if (fullCode.length !== 6) {
      toast.error("Ingresa el código completo de 6 dígitos")
      return
    }
    setStep("verifying")
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Código incorrecto" }))
        toast.error(err.error)
        setStep("sent")
        return
      }
      setStep("verified")
      toast.success("¡Teléfono verificado exitosamente!")
    } catch {
      toast.error("Error de conexión")
      setStep("sent")
    }
  }

  const handleChangeNumber = () => {
    setStep("idle")
    setCode(["", "", "", "", "", ""])
    setPhone("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          {step === "verified" ? (
            <CheckCircle className="size-6 text-green-500" />
          ) : (
            <Smartphone className="size-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">Teléfono</h3>
          <p className="text-sm text-muted-foreground">
            {step === "verified"
              ? "Tu número está verificado"
              : "Verifica tu número para recibir notificaciones SMS"}
          </p>
        </div>
      </div>

      {step === "verified" ? (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-500" />
              <span className="font-medium">{initialPhone || phone}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangeNumber}>
              Cambiar número
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="+584161234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={step === "sending" || step === "sent"}
              className="flex-1"
            />
            <Button
              onClick={handleSendCode}
              disabled={step === "sending" || step === "sent" || !phone}
            >
              {step === "sending" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : step === "sent" ? (
                "Enviado"
              ) : (
                "Enviar código"
              )}
            </Button>
          </div>

          {step === "sent" && (
            <div className="space-y-3">
              <div className="flex justify-center gap-2">
                {code.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="h-12 w-10 text-center text-lg font-bold"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={code.join("").length !== 6}
              >
                Verificar código
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {cooldown > 0 ? (
                  <span>Reenviar en {cooldown}s</span>
                ) : (
                  <button
                    onClick={handleSendCode}
                    className="text-primary hover:underline"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
