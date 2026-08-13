"use client"

import { Input } from "@/components/ui/input"
import type { CustomerInfo } from "./types"

interface ShippingFieldsProps {
  customer: CustomerInfo | null
  saleType: "store" | "shipping"
  shippingMethod: string
  shippingCost: number
  customerAddress: string
  customerCity: string
  customerState: string
  shippingAgency: string
  shippingAgencyAddress: string
  shippingAddress: string
  agenciaEmpresas: string[]
  agenciaEstados: string[]
  agenciaOficinas: any[]
  selectedAgenciaEmpresa: string
  selectedAgenciaEstado: string
  loadingAgencias: boolean
  onSaleTypeChange: (type: "store" | "shipping") => void
  onShippingMethodChange: (method: string) => void
  onShippingCostChange: (cost: number) => void
  onCustomerAddressChange: (value: string) => void
  onCustomerCityChange: (value: string) => void
  onCustomerStateChange: (value: string) => void
  onShippingAddressChange: (value: string) => void
  onAgencyCompanyChange: (empresa: string) => void
  onAgencyStateChange: (estado: string) => void
  onSelectAgencyOffice: (agencia: string, direccion: string) => void
}

export function ShippingFields({
  customer,
  saleType,
  shippingMethod,
  shippingCost,
  customerAddress,
  customerCity,
  customerState,
  shippingAgency,
  shippingAgencyAddress,
  shippingAddress,
  agenciaEmpresas,
  agenciaEstados,
  agenciaOficinas,
  selectedAgenciaEmpresa,
  selectedAgenciaEstado,
  loadingAgencias,
  onSaleTypeChange,
  onShippingMethodChange,
  onShippingCostChange,
  onCustomerAddressChange,
  onCustomerCityChange,
  onCustomerStateChange,
  onShippingAddressChange,
  onAgencyCompanyChange,
  onAgencyStateChange,
  onSelectAgencyOffice,
}: ShippingFieldsProps) {
  return (
    <>
      {customer && (
        <div className="flex items-center gap-1.5 mt-2">
          <button onClick={() => onSaleTypeChange("store")} className={`flex-1 h-7 text-[11px] font-bold rounded border transition-colors ${saleType === "store" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>En tienda</button>
          <button onClick={() => onSaleTypeChange("shipping")} className={`flex-1 h-7 text-[11px] font-bold rounded border transition-colors ${saleType === "shipping" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}>Con envío</button>
        </div>
      )}

      {customer && saleType === "shipping" && (
        <div className="mt-2 space-y-1.5">
          <Input placeholder="Dirección del cliente" value={customerAddress} onChange={(e) => onCustomerAddressChange(e.target.value)} className="h-7 text-[11px]" />
          <div className="flex gap-1.5">
            <Input placeholder="Ciudad" value={customerCity} onChange={(e) => onCustomerCityChange(e.target.value)} className="h-7 text-[11px] flex-1" />
            <Input placeholder="Estado" value={customerState} onChange={(e) => onCustomerStateChange(e.target.value)} className="h-7 text-[11px] flex-1" />
          </div>
          <select value={shippingMethod} onChange={(e) => onShippingMethodChange(e.target.value)} className="w-full h-7 text-[11px] rounded border border-border bg-background px-2">
            <option value="pickup_agency">Retiro en agencia</option>
            <option value="delivery">Delivery</option>
          </select>
          {shippingMethod === "pickup_agency" && (
            <>
              <div className="flex gap-1.5">
                <select value={selectedAgenciaEmpresa} onChange={(e) => onAgencyCompanyChange(e.target.value)} className="flex-1 h-7 text-[11px] rounded border border-border bg-background px-1">
                  <option value="">Courier</option>
                  {agenciaEmpresas.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
                </select>
                <select value={selectedAgenciaEstado} onChange={(e) => onAgencyStateChange(e.target.value)} className="flex-1 h-7 text-[11px] rounded border border-border bg-background px-1">
                  <option value="">Estado</option>
                  {agenciaEstados.map((est) => <option key={est} value={est}>{est}</option>)}
                </select>
              </div>
              {loadingAgencias && <p className="text-[10px] text-muted-foreground">Cargando oficinas...</p>}
              {agenciaOficinas.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {agenciaOficinas.map((oficina) => (
                    <button key={oficina.id} onClick={() => onSelectAgencyOffice(oficina.agencia, oficina.direccion || "")}
                      className={`w-full text-left p-1.5 rounded border text-[11px] transition-colors ${shippingAgency === oficina.agencia && shippingAgencyAddress === (oficina.direccion || "") ? "bg-primary/10 border-primary" : "border-border hover:bg-muted/50"}`}>
                      <span className="font-semibold">{oficina.agencia}</span>
                      {oficina.ciudad && <span className="text-muted-foreground"> — {oficina.ciudad}</span>}
                      {oficina.direccion && <p className="text-[10px] text-muted-foreground truncate">{oficina.direccion}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {shippingMethod === "delivery" && (
            <Input placeholder="Dirección de entrega" value={shippingAddress} onChange={(e) => onShippingAddressChange(e.target.value)} className="h-7 text-[11px]" />
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Costo envío USD:</span>
            <Input type="number" min={0} step="0.01" value={shippingCost} onChange={(e) => onShippingCostChange(parseFloat(e.target.value) || 0)} className="h-7 text-[11px] w-24" />
          </div>
        </div>
      )}
    </>
  )
}
