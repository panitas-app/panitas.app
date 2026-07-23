"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { roleLabels, roleColors } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { Copy, Trash2, UserPlus, Loader2, Check } from "lucide-react"
import type { Role } from "@/lib/roles"

type Member = {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

type Invitation = {
  id: string
  email: string
  role: string
  createdAt: string
}

export function TeamSettings({ storeId }: { storeId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("seller")
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/stores/members")
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
        setInvitations(data.invitations)
      }
    } catch {
      toast.error("Error al cargar el equipo")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function handleInvite() {
    if (inviting) return
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteLink(null)
    try {
      const res = await fetch("/api/stores/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setInviteLink(data.inviteLink)
        toast.success("Invitación creada")
        fetchMembers()
      } else {
        toast.error(data.error || "Error al invitar")
      }
    } catch {
      toast.error("Error al invitar")
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    if (changingRole === memberId) return
    setChangingRole(memberId)
    try {
      const res = await fetch(`/api/stores/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        toast.success("Rol actualizado")
        fetchMembers()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al actualizar rol")
      }
    } catch {
      toast.error("Error al actualizar rol")
    } finally {
      setChangingRole(null)
    }
  }

  async function handleRemove(memberId: string) {
    if (removing === memberId) return
    if (!confirm("¿Eliminar este miembro del equipo? Perderá acceso al panel.")) return
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/stores/members/${memberId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Miembro eliminado")
        setConfirmRemove(null)
        fetchMembers()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error al eliminar")
      }
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setRemoving(null)
    }
  }

  async function copyLink() {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink)
        toast.success("Enlace copiado al portapapeles")
      } catch {
        toast.error("No se pudo copiar")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Current members */}
      <div>
        <h3 className="mb-4 text-sm font-bold text-foreground/80">Miembros actuales ({members.length})</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="w-40">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm" className="size-8">
                      <AvatarImage src={m.user.image || undefined} />
                      <AvatarFallback className="bg-muted text-xs text-foreground/70">
                        {(m.user.name || m.user.email || "??").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground/80">{m.user.name || "Sin nombre"}</span>
                      <span className="text-xs text-muted-foreground">{m.user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(v) => v !== null && handleChangeRole(m.id, v)}
                    disabled={changingRole === m.id}
                  >
                    <SelectTrigger className={cn("h-8 w-36 text-xs font-bold border", roleColors[m.role as Role]?.split(" ").slice(1).join(" ") || "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Encargado</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-red-400"
                    onClick={() => setConfirmRemove(m.id)}
                    title="Eliminar miembro"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-bold text-foreground/80">Invitaciones pendientes ({invitations.length})</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                      <span className="text-sm font-medium text-foreground/80">{inv.email}</span>
                    <Badge className={cn("ml-2 text-[10px] font-bold", roleColors[inv.role as Role])}>{roleLabels[inv.role as Role]}</Badge>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">Pendiente</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite button */}
      <div className="flex justify-center">
        <Button onClick={() => { setInviteOpen(true); setInviteLink(null) }} className="gap-2">
          <UserPlus className="size-4" />
          Invitar nuevo miembro
        </Button>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteLink(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar miembro al equipo</DialogTitle>
            <DialogDescription>
              Envía un enlace de invitación. La persona debe tener una cuenta en Panitas.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                <Check className="mx-auto mb-2 size-8 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-300">Invitación creada</p>
                <p className="mt-1 text-xs text-emerald-400">
                  Comparte este enlace con {inviteEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => { setInviteOpen(false); setInviteLink(null) }}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input
                  placeholder="correo@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Encargado</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="viewer">Visor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                El enlace de invitación expirará en 7 días.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Invitar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm remove dialog */}
      <Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar miembro?</DialogTitle>
            <DialogDescription>
              El usuario perderá acceso al panel de administración de esta tienda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={removing === confirmRemove} onClick={() => confirmRemove && handleRemove(confirmRemove)}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Clock(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
