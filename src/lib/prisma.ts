import { PrismaClient } from "@prisma/client"
import { PrismaNeonHttp } from "@prisma/adapter-neon"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaClient: PrismaClient

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma
} else {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in Vercel env vars or your local .env file",
    )
  }
  const adapter = new PrismaNeonHttp(dbUrl)
  prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
