"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useState } from "react"
import { Plus, Trash2, Smartphone, Banknote } from "lucide-react"
import { BANKS_VENEZUELA, DOCUMENT_TYPES, ACCOUNT_TYPES } from "@/lib/constants"
import { formatAccountNumber, validateAccountNumber, validatePhone, validateDocumentId } from "@/lib/ve-banks"
import type { Store, PaymentAccount } from "@prisma/client"

function PaymentAccountForm({
  account,
  onClose,
}: {
  account?: PaymentAccount
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(account?.type || "bank")
  const [bankCode, setBankCode] = useState(
    account?.bankCode || BANKS_VENEZUELA.find((b) => b.name === account?.bankName)?.code || ""
  )

  const selectedBank = BANKS_VENEZUELA.find((b) => b.code === bankCode)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const formType = form.get("type") as string
    const docId = (form.get("documentId") as string) || ""

    const docValidation = validateDocumentId(docId || "")
    if (!docValidation.valid) {
      toast.error(docValidation.error || "Documento inválido")
      setLoading(false)
      return
    }

    const body: any = {
      type: formType,
      bankName: selectedBank?.name || form.get("bankName"),
      bankCode: bankCode,
      documentId: docValidation.clean,
      accountHolder: form.get("accountHolder"),
    }

    if (formType === "bank") {
      const accNum = (form.get("accountNumber") as string) || ""
      const accValidation = validateAccountNumber(accNum)
      if (!accValidation.valid) {
        toast.error(accValidation.error || "Número de cuenta inválido")
        setLoading(false)
        return
      }
      body.accountType = form.get("accountType")
      body.accountNumber = accNum.replace(/\D/g, "")
    } else if (formType === "mobile") {
      const phone = (form.get("phone") as string) || ""
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.valid) {
        toast.error(phoneValidation.error || "Teléfono inválido")
        setLoading(false)
        return
      }
      body.phone = phoneValidation.clean
      body.phoneBank = selectedBank?.name || form.get("phoneBank")
    }

    try {
      const res = await fetch(account ? `/api/payment-accounts/${account.id}` : "/api/payment-accounts", {
        method: account ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error")
      }
      toast.success(account ? "Cuenta actualizada" : "Cuenta agregada")
      onClose()
      window.location.reload()
    } catch (e: any) {
      toast.error(e.message || "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select name="type" defaultValue={account?.type || "bank"} onValueChange={(v) => v !== null && setType(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar tipo">
              {type === "bank" ? "Cuenta Bancaria" : type === "mobile" ? "Pago Móvil" : ""}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Cuenta Bancaria</SelectItem>
            <SelectItem value="mobile">Pago Móvil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Banco</Label>
        <Select name="bankName" value={bankCode} onValueChange={(v) => v !== null && setBankCode(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar banco" />
          </SelectTrigger>
          <SelectContent className="max-h-[260px] overflow-y-auto">
            {BANKS_VENEZUELA.map((bank) => (
              <SelectItem key={bank.code} value={bank.code}>
                <span className="font-mono text-muted-foreground">{bank.code}</span> {bank.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "bank" && (
        <>
          <div className="space-y-2">
            <Label>Tipo de cuenta</Label>
            <Select name="accountType" defaultValue={account?.accountType || "corriente"}>
              <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar tipo de cuenta" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Número de cuenta (20 dígitos)</Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              defaultValue={account?.accountNumber || ""}
              placeholder="0134-0055-XX-XXXXXXXXXX"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "")
                if (digits.length === 20) {
                  const fmt = formatAccountNumber(digits)
                  const validation = validateAccountNumber(digits)
                  if (!validation.valid) {
                    e.target.setCustomValidity(validation.error || "")
                  } else {
                    e.target.setCustomValidity("")
                  }
                }
              }}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              {selectedBank ? `Código del banco: ${selectedBank.code} — ` : ""}
              Formato: BBBB-SSSS-DD-CCCCCCCCCC (20 dígitos)
            </p>
          </div>
        </>
      )}

      {type === "mobile" && (
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono afiliado (11 dígitos)</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={account?.phone || ""}
            placeholder="04121234567"
            onChange={(e) => {
              const v = validatePhone(e.target.value)
              e.target.setCustomValidity(v.valid ? "" : v.error || "")
            }}
            required
          />
          <p className="text-[10px] text-muted-foreground">Debe comenzar con 04 y tener 11 dígitos</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="accountHolder">Titular</Label>
        <Input id="accountHolder" name="accountHolder" defaultValue={account?.accountHolder || ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="documentId">Documento de identidad</Label>
        <div className="flex gap-2">
          <Select name="docTypePrefix" defaultValue={(account?.documentId || "V")[0]}>
            <SelectTrigger className="w-20 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="documentId"
            name="documentId"
            className="flex-1"
            defaultValue={(account?.documentId || "").slice(1)}
            placeholder="12345678"
            inputMode="numeric"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : account ? "Actualizar" : "Agregar"}
      </Button>
    </form>
  )
}

export function SettingsPayments({ store }: { store: Store & { paymentAccounts: PaymentAccount[] } }) {
  const [open, setOpen] = useState(false)

  async function deleteAccount(id: string) {
    if (!confirm("¿Eliminar esta cuenta?")) return
    try {
      const res = await fetch(`/api/payment-accounts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error")
      toast.success("Cuenta eliminada")
      window.location.reload()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {store.paymentAccounts.length} cuenta(s) registrada(s)
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm">
            <Plus className="size-4" />
            Agregar cuenta
          </Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva cuenta de pago</DialogTitle>
            </DialogHeader>
            <PaymentAccountForm onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {store.paymentAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cuentas registradas</p>
      ) : (
        <div className="space-y-2">
          {store.paymentAccounts.map((account) => {
            const bank = BANKS_VENEZUELA.find((b) => b.code === account.bankCode || b.name === account.bankName)
            return (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-1.5">
                    {account.type === "mobile" ? <Smartphone className="size-3.5 text-primary" /> : <Banknote className="size-3.5 text-primary" />}
                    {account.type === "mobile" ? "Pago Móvil" : account.bankName}
                    {bank && <Badge variant="outline" className="text-[9px] font-mono">{bank.code}</Badge>}
                  </p>
                  {account.type === "mobile" ? (
                    <p className="text-xs text-muted-foreground font-mono">
                      {account.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatAccountNumber(account.accountNumber || "")}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {account.accountHolder} — {account.documentId}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteAccount(account.id)}>
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
