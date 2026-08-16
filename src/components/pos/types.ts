export interface Product {
  id: string
  name: string
  price: number
  stock: number
  images: string
  sku?: string | null
  barcode?: string | null
  isWholesale: boolean
  wholesalePrice?: number | null
  wholesaleScales?: string | null
  costPrice?: number | null
  hasSizes: boolean
  sizes?: string | null
  categoryId: string | null
  category: { id: string; name: string } | null
}

export interface Category {
  id: string
  name: string
}

export interface CartItem {
  productId: string
  type: "PRODUCT" | "CUSTOM"
  lineId?: string
  name: string
  price: number
  quantity: number
  stock: number
  wholesale?: boolean
  originalPrice?: number
}

export function cartLineKey(item: CartItem): string {
  return item.lineId || item.productId
}

export interface CustomerInfo {
  name: string
  phone: string
  email?: string
  address?: string
  documentId?: string
}

export interface CustomerResult {
  id: string
  name: string
  phone: string
  documentId?: string | null
}

export interface TodaySale {
  id: string
  orderNumber: string
  total: number
  customerName: string
  createdAt: string
  paymentStatus: string
}

export interface PaymentSplit {
  method: string
  amount: number
}

export type ScannerStatus = "idle" | "connecting" | "connected" | "error"
