"use client"

import { useState, useRef, useEffect } from "react"
import { Mail, CheckCircle, Loader2, BadgeCheck, AlertTriangle, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Props {
  email?: string | null
  initialVerified: boolean
  initialPhone?: string | null
  initialPhoneVerified: boolean
}

export function SettingsEmail({ email, initialVerified, initialPhone, initialPhoneVerified }: Props) {
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
    setStep("sending")
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al enviar codigo" }))
        toast.error(err.error)
        setStep("idle")
        return
      }
      setStep("sent")
      setCooldown(60)
      toast.success("Codigo enviado a tu correo")
    } catch {
      toast.error("Error de conexion")
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
      toast.error("Ingresa el codigo completo de 6 digitos")
      return
    }
    setStep("verifying")
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Codigo incorrecto" }))
        toast.error(err.error)
        setStep("sent")
        return
      }
      setStep("verified")
      toast.success("Email verificado exitosamente!")
    } catch {
      toast.error("Error de conexion")
      setStep("sent")
    }
  }

  return (
    <div className="space-y-6">
      {/* Email Verification */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          {step === "verified" ? (
            <CheckCircle className="size-6 text-green-500" />
          ) : (
            <Mail className="size-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">Correo electronico</h3>
          <p className="text-sm text-muted-foreground">
            {step === "verified"
              ? "Tu correo esta verificado"
              : "Verifica tu correo para asegurar tu cuenta"}
          </p>
        </div>
      </div>

      {step === "verified" ? (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-5 text-green-500" />
            <span className="font-medium">{email}</span>
            <span className="ml-auto text-xs text-green-600 font-semibold">Verificado</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">{email}</span>
            <span className="text-xs text-amber-600 font-semibold">No verificado</span>
          </div>

          {step === "idle" && (
            <Button onClick={handleSendCode} className="w-full">
              <Mail className="size-4 mr-2" />
              Enviar codigo de verificacion
            </Button>
          )}

          {step === "sending" && (
            <Button disabled className="w-full">
              <Loader2 className="size-4 animate-spin mr-2" />
              Enviando...
            </Button>
          )}

          {(step === "sent" || step === "verifying") && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Ingresa el codigo de 6 digitos que enviamos a <strong>{email}</strong>
              </p>
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
                    disabled={step === "verifying"}
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleVerify}
                disabled={code.join("").length !== 6 || step === "verifying"}
              >
                {step === "verifying" ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  "Verificar codigo"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {cooldown > 0 ? (
                  <span>Reenviar en {cooldown}s</span>
                ) : (
                  <button onClick={handleSendCode} className="text-primary hover:underline">
                    Reenviar codigo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phone Verification */}
      <div className="border-t border-border pt-6 mt-6">
        <PhoneVerificationSection
          initialPhone={initialPhone}
          initialVerified={initialPhoneVerified}
        />
      </div>
    </div>
  )
}

function PhoneVerificationSection({
  initialPhone,
  initialVerified,
}: {
  initialPhone?: string | null
  initialVerified: boolean
}) {
  const [phone, setPhone] = useState(initialPhone || "")
  const [pStep, setPStep] = useState<"idle" | "sending" | "sent" | "verified">(
    initialVerified ? "verified" : "idle"
  )
  const [pCode, setPCode] = useState(["", "", "", "", "", ""])
  const [pCooldown, setPCooldown] = useState(0)
  const [pVerifying, setPVerifying] = useState(false)
  const pTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    return () => {
      if (pTimerRef.current) clearInterval(pTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (pCooldown > 0) {
      pTimerRef.current = setInterval(() => {
        setPCooldown((prev) => {
          if (prev <= 1) {
            if (pTimerRef.current) clearInterval(pTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (pTimerRef.current) clearInterval(pTimerRef.current)
    }
  }, [pCooldown])

  const handleSendPhoneCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Ingresa un numero de telefono valido")
      return
    }
    setPStep("sending")
    try {
      const res = await fetch("/api/auth/send-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error al enviar codigo" }))
        toast.error(err.error)
        setPStep("idle")
        return
      }
      setPStep("sent")
      setPCooldown(60)
      toast.success("Codigo enviado por SMS")
    } catch {
      toast.error("Error de conexion")
      setPStep("idle")
    }
  }

  const handlePCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...pCode]
    newCode[index] = value.slice(0, 1)
    setPCode(newCode)
    if (value && index < 5) {
      pInputRefs.current[index + 1]?.focus()
    }
  }

  const handlePKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pCode[index] && index > 0) {
      pInputRefs.current[index - 1]?.focus()
    }
  }

  const handlePhoneVerify = async () => {
    const fullCode = pCode.join("")
    if (fullCode.length !== 6) {
      toast.error("Ingresa el codigo completo de 6 digitos")
      return
    }
    setPVerifying(true)
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Codigo incorrecto" }))
        toast.error(err.error)
        setPVerifying(false)
        return
      }
      setPStep("verified")
      setPVerifying(false)
      toast.success("Telefono verificado exitosamente!")
    } catch {
      toast.error("Error de conexion")
      setPVerifying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          {pStep === "verified" ? (
            <CheckCircle className="size-6 text-green-500" />
          ) : (
            <Smartphone className="size-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">Telefono</h3>
          <p className="text-sm text-muted-foreground">
            {pStep === "verified"
              ? "Tu numero esta verificado"
              : "Verifica tu numero para recibir notificaciones SMS"}
          </p>
        </div>
      </div>

      {pStep === "verified" ? (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="size-5 text-green-500" />
            <span className="font-medium">{phone}</span>
            <span className="ml-auto text-xs text-green-600 font-semibold">Verificado</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="+584161234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={pStep === "sending" || pStep === "sent"}
              className="flex-1"
            />
            <Button
              onClick={handleSendPhoneCode}
              disabled={pStep === "sending" || pStep === "sent" || !phone}
            >
              {pStep === "sending" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : pStep === "sent" ? (
                "Enviado"
              ) : (
                "Enviar codigo"
              )}
            </Button>
          </div>

          {pStep === "sent" && (
            <div className="space-y-3">
              <div className="flex justify-center gap-2">
                {pCode.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { pInputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handlePKeyDown(i, e)}
                    className="h-12 w-10 text-center text-lg font-bold"
                    autoFocus={i === 0}
                    disabled={pVerifying}
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handlePhoneVerify}
                disabled={pCode.join("").length !== 6 || pVerifying}
              >
                {pVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  "Verificar codigo"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {pCooldown > 0 ? (
                  <span>Reenviar en {pCooldown}s</span>
                ) : (
                  <button
                    onClick={handleSendPhoneCode}
                    className="text-primary hover:underline"
                  >
                    Reenviar codigo
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