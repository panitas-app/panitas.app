"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

interface ReceiptOrder {
  orderNumber: string
  status: string
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  paymentStatus: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerAddress: string | null
  customerCity: string | null
  customerState: string | null
  shippingMethod: string
  shippingAgency: string | null
  shippingAgencyAddress: string | null
  shippingAddress: string | null
  createdAt: string
  items: Array<{
    quantity: number
    price: number
    subtotal: number
    product: { name: string } | null
  }>
  payments: Array<{
    method: string
    amount: number
    reference: string | null
    bankOrigin: string | null
    paidAt: string | null
    status: string
    paymentAccount: { bankName: string | null; accountNumber: string | null } | null
  }>
  store: { name: string; whatsapp: string | null; email: string | null; phone: string | null }
}

const shippingLabels: Record<string, string> = {
  pickup_agency: "Envío por agencia",
  pickup_store: "Retiro en tienda",
  delivery: "Delivery",
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-VE", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso))
  } catch { return iso }
}

export function DownloadReceipt({ order }: { order: ReceiptOrder }) {
  function generatePDF() {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Colors
    const primary: [number, number, number] = [24, 75, 191]
    const accent: [number, number, number] = [16, 42, 67]
    const yellow: [number, number, number] = [255, 185, 46]

    // Header bar
    doc.setFillColor(...primary)
    doc.rect(0, 0, pageWidth, 12, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(order.store.name || "PANITAS", pageWidth / 2, 8, { align: "center" })

    // Title
    y = 22
    doc.setTextColor(...accent)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("RECIBO DE COMPRA", pageWidth / 2, y, { align: "center" })

    // Yellow line
    doc.setDrawColor(...yellow)
    doc.setLineWidth(1.5)
    doc.line(20, y + 3, pageWidth - 20, y + 3)

    // Order info
    y = 34
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)

    doc.setFont("helvetica", "bold")
    doc.text("N° de pedido:", 20, y)
    doc.setFont("helvetica", "normal")
    doc.text(order.orderNumber, 55, y)

    doc.setFont("helvetica", "bold")
    doc.text("Fecha:", 20, y + 5)
    doc.setFont("helvetica", "normal")
    doc.text(formatDate(order.createdAt), 55, y + 5)

    doc.setFont("helvetica", "bold")
    doc.text("Estado:", 20, y + 10)
    doc.setFont("helvetica", "normal")
    const statusLabel = order.status === "pending" ? "Pendiente" : order.status === "preparing" ? "Empaquetado" : order.status === "shipped" ? "Despachado" : order.status === "delivered" ? "Entregado" : order.status === "cancelled" ? "Cancelado" : order.status
    doc.text(statusLabel, 55, y + 10)

    // Customer info
    y = 34
    doc.setFont("helvetica", "bold")
    doc.text("Cliente:", pageWidth / 2 + 5, y)
    doc.setFont("helvetica", "normal")
    doc.text(order.customerName, pageWidth / 2 + 5, y + 5)
    doc.text(`Tel: ${order.customerPhone}`, pageWidth / 2 + 5, y + 10)
    if (order.customerEmail) doc.text(`Email: ${order.customerEmail}`, pageWidth / 2 + 5, y + 15)

    // Products table
    y = 55
    const tableData = order.items.map((item) => [
      item.product?.name || "Producto",
      String(item.quantity),
      `$${item.price.toFixed(2)}`,
      `$${item.subtotal.toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: y,
      head: [["Producto", "Cant.", "Precio", "Subtotal"]],
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
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
      },
      margin: { left: 20, right: 20 },
    })

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 5
    const totalX = pageWidth - 55

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text("Subtotal:", totalX, finalY)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...accent)
    doc.text(`$${order.subtotal.toFixed(2)}`, pageWidth - 20, finalY, { align: "right" })

    let nextY = finalY + 5
    if (order.discount > 0) {
      doc.setFont("helvetica", "normal")
      doc.setTextColor(220, 38, 38)
      doc.text("Descuento:", totalX, nextY)
      doc.text(`-$${order.discount.toFixed(2)}`, pageWidth - 20, nextY, { align: "right" })
      nextY += 5
    }

    if (order.shippingCost > 0) {
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100)
      doc.text("Envío:", totalX, nextY)
      doc.text(`$${order.shippingCost.toFixed(2)}`, pageWidth - 20, nextY, { align: "right" })
      nextY += 5
    }

    // Total line
    doc.setDrawColor(...yellow)
    doc.setLineWidth(0.8)
    doc.line(pageWidth - 90, nextY, pageWidth - 20, nextY)
    nextY += 5

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...primary)
    doc.text("TOTAL:", totalX, nextY)
    doc.text(`$${order.total.toFixed(2)}`, pageWidth - 20, nextY, { align: "right" })

    // Shipping info
    const shipY = Math.max(nextY + 15, (doc as any).lastAutoTable.finalY + 60)
    doc.setDrawColor(220)
    doc.setLineWidth(0.3)
    doc.line(20, shipY, pageWidth - 20, shipY)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...accent)
    doc.text("Información de envío", 20, shipY + 6)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)
    doc.text(shippingLabels[order.shippingMethod] || order.shippingMethod, 20, shipY + 12)
    if (order.shippingAgency) doc.text(`Agencia: ${order.shippingAgency}`, 20, shipY + 17)
    if (order.shippingAgencyAddress) doc.text(order.shippingAgencyAddress, 20, shipY + 22)
    if (order.shippingAddress) doc.text(order.shippingAddress, 20, shipY + 22)

    // Payment info
    const paidPayment = order.payments.find((p) => p.status !== "pending")
    if (paidPayment) {
      const payY = shipY
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...accent)
      doc.text("Información de pago", pageWidth / 2 + 5, payY + 6)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(80)
      const methodLabel = paidPayment.method === "bank_transfer" ? "Transferencia" : paidPayment.method === "pago_movil" ? "Pago Móvil" : paidPayment.method === "binancepay" ? "Binance Pay" : paidPayment.method
      doc.text(`Método: ${methodLabel}`, pageWidth / 2 + 5, payY + 12)
      if (paidPayment.reference) doc.text(`Referencia: ${paidPayment.reference}`, pageWidth / 2 + 5, payY + 17)
      if (paidPayment.bankOrigin) doc.text(`Banco origen: ${paidPayment.bankOrigin}`, pageWidth / 2 + 5, payY + 22)
      if (paidPayment.paidAt) doc.text(`Pagado el: ${formatDate(paidPayment.paidAt)}`, pageWidth / 2 + 5, payY + 27)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...primary)
      doc.text(`Monto: $${paidPayment.amount.toFixed(2)}`, pageWidth / 2 + 5, payY + 34)
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20
    doc.setDrawColor(220)
    doc.setLineWidth(0.3)
    doc.line(20, footerY - 2, pageWidth - 20, footerY - 2)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    const footerText = `${order.store.name} | ${order.store.whatsapp ? `WhatsApp: ${order.store.whatsapp}` : ""} ${order.store.email ? `| Email: ${order.store.email}` : ""}`
    doc.text(footerText, pageWidth / 2, footerY + 3, { align: "center" })
    doc.text("Este documento es un recibo de compra no fiscal.", pageWidth / 2, footerY + 8, { align: "center" })

    doc.save(`recibo-${order.orderNumber}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={generatePDF}>
      <FileDown className="size-4" />
      Descargar recibo
    </Button>
  )
}
