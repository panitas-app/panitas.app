/** Tipos de datos que consume el Business Intelligence Center (FASE 5A). */

export interface BicMonthlyPoint {
  month: string
  label: string
  revenue: number
  expenses: number
}

export interface BicBalance {
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  totalRevenue: number
  todayExpenses: number
  weekExpenses: number
  monthExpenses: number
  totalExpenses: number
  rate: number
  topProducts: { name: string; qty: number; revenue: number }[]
  statusCounts: Record<string, number>
  recentActivity: {
    id: string
    orderNumber: string
    customerName: string
    status: string
    total: number
    createdAt: string
  }[]
  totalOrders: number
  monthOrders: number
  averageTicketMonth: number
  monthlySeries: BicMonthlyPoint[]
  customers: {
    total: number
    newThisMonth: number
    recurrent: number
    inactive: number
    averageCustomerValue: number
    totalSpent: number
  }
}

export interface BicInventarioProduct {
  id: string
  name: string
  stock: number
  costPrice: number
  price: number
  marginPerUnit: number
  marginPercent: number
}

export interface BicInventario {
  totalCostValue: number
  totalSellValue: number
  totalProfit: number
  totalExpenses: number
  profitMargin: number
  productCount: number
  products: BicInventarioProduct[]
}

export interface BicBreakeven {
  puntoEquilibrio: number
  ventasMes: number
  balance: number
  porcentaje: number
  gastosTotales: number
  gastosFijos: number
  categorias: { name: string; amount: number }[]
  month: number
  year: number
}
