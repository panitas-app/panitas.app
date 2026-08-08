"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, AlertTriangle, Loader2, MessageCircle, Plug, ShieldAlert, Unplug } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WhatsAppConnectionView {
  id?: string
  provider?: string
  status: string
  configured: boolean
  phoneNumberId: string
  wabaId?: string
  verifyTokenSet: boolean
  displayPhoneNumber?: string
  errorMessage: string | null
  connectedAt: string | null
  disconnectedAt: string | null
  lastHealthAt: string | null
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  unconfigured: { label: "No configurado", className: "bg-muted text-muted-foreground" },
  connected: { label: "Conectado", className: "bg-green-100 text-green-700" },
  disconnected: { label: "Desconectado", className: "bg-amber-100 text-amber-700" },
  error: { label: "Error", className: "bg-red-100 text-red-700" },
  revoked: { label: "Revocado", className: "bg-red-100 text-red-700" },
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  const data = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(data?.error ?? "Error de red")
  return data as T
}

function emptyConnection(): WhatsAppConnectionView {
  return {
    status: "unconfigured",
    configured: false,
    phoneNumberId: "",
    verifyTokenSet: false,
    errorMessage: null,
    connectedAt: null,
    disconnectedAt: null,
    lastHealthAt: null,
  }
}

export function WhatsAppChannelPanel() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connection, setConnection] = useState<WhatsAppConnectionView>(emptyConnection)

  const [accessToken, setAccessToken] = useState("")
  const [phoneNumberId, setPhoneNumberId] = useState("")
  const [wabaId, setWabaId] = useState("")
  const [verifyToken, setVerifyToken] = useState("")
  const [appSecret, setAppSecret] = useState("")
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await request<{ connection?: WhatsAppConnectionView }>("/api/inbox/channels/whatsapp")
      setConnection(data.connection ?? emptyConnection())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo consultar la conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al abrir el panel
    if (open) void load()
  }, [open, load])

  async function connect() {
    if (!accessToken.trim() || !phoneNumberId.trim()) {
      toast.error("Completa access token y phone number id")
      return
    }
    setSaving(true)
    try {
      const data = await request<{ connection: WhatsAppConnectionView }>("/api/inbox/channels/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          action: "connect",
          accessToken: accessToken.trim(),
          phoneNumberId: phoneNumberId.trim(),
          wabaId: wabaId.trim(),
          verifyToken: verifyToken.trim(),
          appSecret: appSecret.trim(),
          displayPhoneNumber: displayPhoneNumber.trim(),
        }),
      })
      setConnection(data.connection)
      setAccessToken("")
      setVerifyToken("")
      setAppSecret("")
      toast.success("Conexión de WhatsApp guardada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo conectar")
    } finally {
      setSaving(false)
    }
  }

  async function act(action: "disconnect" | "revoke" | "health") {
    setSaving(true)
    try {
      const data = await request<{ connection: WhatsAppConnectionView | null }>("/api/inbox/channels/whatsapp", {
        method: "POST",
        body: JSON.stringify({ action }),
      })
      setConnection(data.connection ?? emptyConnection())
      const labels = {
        disconnect: "WhatsApp desconectado",
        revoke: "Conexión revocada (credenciales eliminadas)",
        health: "Salud verificada",
      }
      toast.success(labels[action])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La acción falló")
    } finally {
      setSaving(false)
    }
  }

  const status = STATUS_STYLE[connection?.status ?? "unconfigured"] ?? STATUS_STYLE.unconfigured

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <MessageCircle className="size-4" />
        WhatsApp
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" />
            Conexión de WhatsApp
          </DialogTitle>
          <DialogDescription>
            Conecta tu número de WhatsApp Business (Meta Cloud API) para atender a tus clientes desde la bandeja unificada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Estado: </span>
            <span className="font-medium text-foreground">{status.label}</span>
            {connection?.displayPhoneNumber ? (
              <span className="ml-2 text-muted-foreground">({connection.displayPhoneNumber})</span>
            ) : null}
          </div>
          {loading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge className={status.className}>{status.label}</Badge>
          )}
        </div>

        {connection?.errorMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{connection.errorMessage}</span>
          </div>
        ) : null}

        {connection?.status === "connected" ? (
          <div className="space-y-1.5 rounded-xl border px-3 py-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Phone number id: </span>
              {connection.phoneNumberId}
            </p>
            {connection.wabaId ? (
              <p>
                <span className="font-medium text-foreground">WABA id: </span>
                {connection.wabaId}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-foreground">Verify token: </span>
              {connection.verifyTokenSet ? "Configurado" : "No configurado"}
            </p>
            {connection.lastHealthAt ? (
              <p>
                <span className="font-medium text-foreground">Última revisión de salud: </span>
                {new Date(connection.lastHealthAt).toLocaleString("es-ES")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-access-token">Access token (Token de la Meta App)</Label>
            <Input
              id="wa-access-token"
              type="password"
              placeholder="EAA..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone-id">Phone number id</Label>
              <Input
                id="wa-phone-id"
                placeholder="Ej. 101234567890123"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-waba-id">WABA id (opcional)</Label>
              <Input id="wa-waba-id" placeholder="Ej. 101234567890123" value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-verify-token">Verify token (opcional)</Label>
              <Input
                id="wa-verify-token"
                type="password"
                placeholder="Token del webhook"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-app-secret">App secret (opcional)</Label>
              <Input
                id="wa-app-secret"
                type="password"
                placeholder="Firma de webhooks"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-display-phone">Número visible (opcional)</Label>
            <Input
              id="wa-display-phone"
              placeholder="Ej. +58 412 123 4567"
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
            />
          </div>
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Las credenciales se guardan cifradas de tu lado y nunca se muestran ni se registran en los logs.
            Necesitas la suscripción <span className="font-medium text-foreground">Panitas Negocios Plus</span>.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 gap-2">
            {connection?.status === "connected" ? (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void act("health")}
                  disabled={saving}
                >
                  <Activity className="size-4" />
                  Verificar salud
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void act("disconnect")}
                  disabled={saving}
                >
                  <Unplug className="size-4" />
                  Desconectar
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => void act("revoke")}
                  disabled={saving}
                >
                  <ShieldAlert className="size-4" />
                  Revocar
                </Button>
              </>
            ) : (
              <Button className="gap-2" onClick={() => void connect()} disabled={saving}>
                <Plug className="size-4" />
                {saving ? "Guardando..." : "Guardar y conectar"}
              </Button>
            )}
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
