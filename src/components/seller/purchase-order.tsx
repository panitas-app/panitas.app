"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

function formatDateShort(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-VE", {
      day: "2-digit", month: "long", year: "numeric",
    }).format(new Date(iso))
  } catch { return iso }
}

interface OrderItem {
  quantity: number
  price: number
  subtotal: number
  productName?: string
  product?: { name: string } | null
}

interface OrderData {
  id: string
  orderNumber: string
  total: number
  createdAt: string
  creditDays?: number | null
  dueDate?: string | null
  customerName: string
  customerPhone: string
  customerAddress: string | null
  items: OrderItem[]
  payments?: Array<{
    method: string
    amount: number
    reference?: string | null
    bankOrigin?: string | null
    paidAt?: string | null
    status?: string
    paymentAccount?: { bankName?: string | null; accountNumber?: string | null } | null
  }>
  store?: {
    name: string
    whatsapp?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    user?: { name?: string | null; email?: string | null } | null
  }
}

function generatePurchaseOrderPDF(order: OrderData) {
  const store = order.store || ({} as any)
  const owner = store.user || {}
  const items = order.items || []
  const payments = order.payments || []
  const isCredit = order.creditDays && order.creditDays > 0

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  const primary: [number, number, number] = [24, 75, 191]
  const accent: [number, number, number] = [16, 42, 67]
  const yellow: [number, number, number] = [255, 185, 46]

  doc.setFillColor(...primary)
  doc.rect(0, 0, pageWidth, 12, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(store.name || "PANITAS", pageWidth / 2, 8, { align: "center" })

  y = 22
  doc.setTextColor(...accent)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("ORDEN DE COMPRA", pageWidth / 2, y, { align: "center" })

  doc.setDrawColor(...yellow)
  doc.setLineWidth(1.5)
  doc.line(20, y + 3, pageWidth - 20, y + 3)

  y = 34
  doc.setFontSize(9)
  doc.setTextColor(100)

  doc.setFont("helvetica", "bold")
  doc.text("N° de pedido:", 20, y)
  doc.setFont("helvetica", "normal")
  doc.text(order.orderNumber, 55, y)

  doc.setFont("helvetica", "bold")
  doc.text("Fecha:", 20, y + 5)
  doc.setFont("helvetica", "normal")
  doc.text(formatDateShort(order.createdAt), 55, y + 5)

  if (isCredit) {
    doc.setFont("helvetica", "bold")
    doc.text("Días de crédito:", 20, y + 10)
    doc.setFont("helvetica", "normal")
    doc.text(`${order.creditDays} días`, 55, y + 10)
  }

  y = 34
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...accent)
  doc.text("Datos del cliente", pageWidth / 2 + 5, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80)
  doc.text(order.customerName, pageWidth / 2 + 5, y + 5)
  doc.text(`Tel: ${order.customerPhone}`, pageWidth / 2 + 5, y + 10)
  if (order.customerAddress) doc.text(`Dir: ${order.customerAddress}`, pageWidth / 2 + 5, y + 15)

  const ownerY = Math.max(y + (order.customerAddress ? 22 : 18), 55)
  doc.setDrawColor(220)
  doc.setLineWidth(0.3)
  doc.line(20, ownerY, pageWidth - 20, ownerY)

  let infoY = ownerY + 8
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...accent)
  doc.text("Datos del comercio", 20, infoY)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(80)
  infoY += 5
  if (owner.name) { doc.text(`Propietario: ${owner.name}`, 20, infoY); infoY += 5 }
  doc.text(store.name || "", 20, infoY); infoY += 5
  if (store.phone) { doc.text(`Tel: ${store.phone}`, 20, infoY); infoY += 5 }
  if (store.whatsapp) { doc.text(`WhatsApp: ${store.whatsapp}`, 20, infoY); infoY += 5 }
  if (store.email) { doc.text(`Email: ${store.email}`, 20, infoY); infoY += 5 }
  if (store.address) { doc.text(`Dir: ${store.address}`, 20, infoY); infoY += 5 }

  const tableStartY = Math.max(infoY + 5, 75)
  const tableData = items.map((item) => [
    item.productName || item.product?.name || "Producto",
    String(item.quantity),
    `$${item.price.toFixed(2)}`,
    `$${item.subtotal.toFixed(2)}`,
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [["Descripción", "Cant.", "Precio Unit.", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(...primary)
  doc.text("TOTAL:", pageWidth - 55, finalY)
  doc.text(`$${order.total.toFixed(2)}`, pageWidth - 20, finalY, { align: "right" })

  if (isCredit) {
    const payY = finalY + 15
    doc.setDrawColor(220)
    doc.setLineWidth(0.3)
    doc.line(20, payY, pageWidth - 20, payY)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...accent)
    doc.text("Información de pago", 20, payY + 6)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)

    const payment = payments[0]
    doc.text("Método: Crédito", 20, payY + 12)
    doc.text(`Días de crédito: ${order.creditDays} días`, 20, payY + 17)
    if (order.dueDate) doc.text(`Fecha de vencimiento: ${formatDateShort(order.dueDate)}`, 20, payY + 22)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...primary)
    doc.text(`Monto: $${order.total.toFixed(2)}`, 20, payY + 28)
  }

  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setDrawColor(220)
  doc.setLineWidth(0.3)
  doc.line(20, footerY - 2, pageWidth - 20, footerY - 2)
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.setFont("helvetica", "normal")
  const footerText = `${store.name || ""} | ${store.whatsapp ? `WhatsApp: ${store.whatsapp}` : ""} ${store.email ? `| Email: ${store.email}` : ""}`
  doc.text(footerText, pageWidth / 2, footerY + 3, { align: "center" })
  doc.text("Este documento es una orden de compra no fiscal.", pageWidth / 2, footerY + 8, { align: "center" })

  const blob = doc.output("blob")
  window.open(URL.createObjectURL(blob), "_blank")
}

export function PurchaseOrderDownload({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/seller/orders/${orderId}`)
      if (!res.ok) throw new Error("Error al cargar pedido")
      const order = await res.json()
      generatePurchaseOrderPDF(order)
    } catch (err: any) {
      toast.error(err.message || "Error al generar orden de compra")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleClick} disabled={loading}>
      <FileDown className="size-4" />
      {loading ? "Generando..." : "Descargar orden"}
    </Button>
  )
}

/** For admin panel — receives order data directly */
export function DownloadPurchaseOrder({ order }: { order: OrderData }) {
  const [loading, setLoading] = useState(false)

  function handleClick() {
    setLoading(true)
    try {
      generatePurchaseOrderPDF(order)
    } catch (err: any) {
      toast.error(err.message || "Error al generar orden")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleClick} disabled={loading}>
      <FileDown className="size-4" />
      {loading ? "Generando..." : "Descargar orden"}
    </Button>
  )
}
