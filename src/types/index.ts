export type ShippingMethod = "pickup_agency" | "pickup_store" | "delivery"
export type OrderStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"
export type PlanType = "free" | "basic" | "advanced"

export interface Store {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  address: string | null
  logo: string | null
  banner: string | null
  shippingCost: number
  plan: PlanType
  planExpiresAt: Date | null
  active: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  order: number
  storeId: string
  createdAt: Date
  updatedAt: Date
}

export interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  storeId: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  costPrice: number | null
  images: string[]
  stock: number | null
  active: boolean
  featured: boolean
  categoryId: string | null
  collectionId: string | null
  storeId: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentAccount {
  id: string
  bankCode: string
  bankName: string
  accountType: string
  accountNumber: string
  holderName: string
  holderId: string
  phone: string | null
  email: string | null
  active: boolean
  storeId: string
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  currency: string
  bcvRate: number
  notes: string | null
  shippingMethod: ShippingMethod
  shippingAgency: string | null
  shippingAddress: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  customerId: string | null
  storeId: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  quantity: number
  price: number
  productId: string
  orderId: string
  createdAt: Date
}

export interface OrderPayment {
  id: string
  amount: number
  reference: string
  bankCode: string
  bankName: string
  status: PaymentStatus
  paymentAccountId: string
  orderId: string
  createdAt: Date
  updatedAt: Date
}

export interface BcvRate {
  id: string
  rate: number
  date: Date
  createdAt: Date
}
