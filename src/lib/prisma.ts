import { PrismaClient } from "@prisma/client"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

neonConfig.webSocketConstructor = ws

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
  const pool = new Pool({ connectionString: dbUrl })
  const adapter = new PrismaNeon(pool)
  prismaClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
