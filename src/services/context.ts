export type ServiceContext = {
  userId?: string
  storeId?: string
  negocioId?: string
  role?: string
  plan?: string
  storeName?: string
  storeEmail?: string | null
}

export type StoreServiceContext = ServiceContext & {
  storeId: string
  userId: string
}

export type NegocioServiceContext = ServiceContext & {
  negocioId: string
  userId: string
}
