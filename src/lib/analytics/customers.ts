import { CustomerRepository } from "@/repositories/customer.repository"

export type CustomerMetricsOptions = {
  inactiveDays?: number
  repo?: CustomerRepository
}

export type CustomerMetrics = {
  total: number
  newThisMonth: number
  recurrent: number
  inactive: number
  inactiveDays: number
  averageCustomerValue: number
  totalSpent: number
}

/** Métricas de la cartera de clientes (solo lectura, listas para el agente). */
export async function getCustomerMetrics(storeId: string, options: CustomerMetricsOptions = {}): Promise<CustomerMetrics> {
  const repo = options.repo ?? new CustomerRepository()
  return repo.metrics(storeId, options.inactiveDays ?? 60)
}
