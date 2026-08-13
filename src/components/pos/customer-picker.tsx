"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, UserPlus, X } from "lucide-react"
import type { CustomerInfo, CustomerResult } from "./types"

interface CustomerPickerProps {
  customer: CustomerInfo | null
  customerSearch: string
  customerResults: CustomerResult[]
  showCustomerSearch: boolean
  showNewCustomer: boolean
  newCustomerName: string
  newCustomerPhone: string
  newCustomerDocumentId: string
  onCustomerSearchChange: (value: string) => void
  onSelectCustomer: (customer: CustomerResult) => void
  onClearCustomer: () => void
  onStartNewCustomer: () => void
  onCancelNewCustomer: () => void
  onNewCustomerNameChange: (value: string) => void
  onNewCustomerPhoneChange: (value: string) => void
  onNewCustomerDocumentIdChange: (value: string) => void
  onCreateCustomer: () => void
  onShowCustomerSearch: () => void
  onHideCustomerSearch: () => void
}

export function CustomerPicker({
  customer,
  customerSearch,
  customerResults,
  showCustomerSearch,
  showNewCustomer,
  newCustomerName,
  newCustomerPhone,
  newCustomerDocumentId,
  onCustomerSearchChange,
  onSelectCustomer,
  onClearCustomer,
  onStartNewCustomer,
  onCancelNewCustomer,
  onNewCustomerNameChange,
  onNewCustomerPhoneChange,
  onNewCustomerDocumentIdChange,
  onCreateCustomer,
  onShowCustomerSearch,
  onHideCustomerSearch,
}: CustomerPickerProps) {
  return (
    <>
      <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Cliente</Label>
      {customer ? (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
          <div>
            <p className="text-xs font-semibold">{customer.name}</p>
            <p className="text-[10px] text-muted-foreground">{customer.phone}{customer.documentId ? ` · CI: ${customer.documentId}` : ""}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={onClearCustomer}>
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Input
                placeholder="Buscar por nombre, teléfono o cédula..."
                value={showCustomerSearch ? customerSearch : ""}
                onChange={(e) => onCustomerSearchChange(e.target.value)}
                onFocus={onShowCustomerSearch}
                onBlur={onHideCustomerSearch}
                className="h-8 text-xs"
              />
              {showCustomerSearch && customerResults.length > 0 && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-10 max-h-28 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button key={c.id} type="button" className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2"
                      onMouseDown={() => onSelectCustomer(c)}>
                      <User className="size-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{c.name}</span>
                      {c.documentId && <span className="text-[10px] text-muted-foreground shrink-0">CI: {c.documentId}</span>}
                      <span className="text-muted-foreground ml-auto shrink-0">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs shrink-0" onClick={onStartNewCustomer}>
              <UserPlus className="size-3.5" /> Nuevo
            </Button>
          </div>

          {showCustomerSearch && customerSearch.length >= 2 && customerResults.length === 0 && (
            <div className="mt-1 rounded-lg border border-dashed border-border p-2">
              <p className="text-[10px] text-muted-foreground mb-1.5">Cliente no encontrado</p>
              <div className="flex gap-1.5">
                <Input placeholder="Nombre" value={customerSearch} onChange={() => {}} className="h-7 text-[11px] flex-1" />
                <Button size="sm" variant="outline" className="h-7 text-[10px] shrink-0"
                  onMouseDown={onStartNewCustomer}>
                  Crear
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showNewCustomer && !customer && (
        <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-primary">Nuevo cliente</p>
          <Input placeholder="Nombre *" value={newCustomerName} onChange={(e) => onNewCustomerNameChange(e.target.value)} className="h-7 text-[11px]" autoFocus />
          <Input placeholder="Teléfono *" value={newCustomerPhone} onChange={(e) => onNewCustomerPhoneChange(e.target.value)} className="h-7 text-[11px]" />
          <Input placeholder="Cédula / RIF" value={newCustomerDocumentId} onChange={(e) => onNewCustomerDocumentIdChange(e.target.value)} className="h-7 text-[11px]" />
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={onCancelNewCustomer}>Cancelar</Button>
            <Button size="sm" className="h-7 text-[10px] flex-1" onClick={onCreateCustomer}>Agregar cliente</Button>
          </div>
        </div>
      )}
    </>
  )
}
