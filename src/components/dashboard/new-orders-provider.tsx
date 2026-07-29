"use client"

import { createContext, useContext, useMemo } from "react"
import { useNewOrders } from "@/hooks/use-new-orders"

interface NewOrdersContextType {
  newCount: number
  resetCount: () => void
}

const NewOrdersContext = createContext<NewOrdersContextType>({
  newCount: 0,
  resetCount: () => {},
})

export function useNewOrdersContext() {
  return useContext(NewOrdersContext)
}

export function NewOrdersProvider({ children }: { children: React.ReactNode }) {
  const { newCount, resetCount } = useNewOrders()

  const value = useMemo(
    () => ({ newCount, resetCount }),
    [newCount, resetCount],
  )

  return (
    <NewOrdersContext.Provider value={value}>
      {children}
    </NewOrdersContext.Provider>
  )
}
