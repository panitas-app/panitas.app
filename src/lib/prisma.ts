import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

let prismaClient: PrismaClient

if (globalForPrisma.prisma) {
  prismaClient = globalForPrisma.prisma
} else {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db"
  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")

  if (isPostgres) {
    const { Pool } = require("pg")
    const { PrismaPg } = require("@prisma/adapter-pg")
    const pool = new Pool({ connectionString: dbUrl })
    const adapter = new PrismaPg(pool)
    prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  } else {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3")
    const adapter = new PrismaBetterSqlite3({
      url: dbUrl,
    })
    prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  }
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
