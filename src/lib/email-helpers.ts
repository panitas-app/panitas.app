import { prisma } from "@/lib/prisma"
import type { Customer } from "@prisma/client"

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export function getStoreUrl(slug: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${base}/store/${slug}`
}

export async function getStoreOwnerEmail(storeId: string): Promise<string | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { user: { select: { email: true } } },
  })
  return store?.user?.email ?? null
}

export function hasEmail(customer: { email?: string | null }): boolean {
  return !!(customer.email && customer.email.trim().length > 0)
}
