import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter, log: ['error'] })

// Test what the adapter would find
const provider = 'google'
const providerAccountId = '109031233733620218327'

// Direct query: find account by provider + providerAccountId
const account = await prisma.account.findUnique({
  where: {
    provider_providerAccountId: { provider, providerAccountId }
  },
  include: { user: true }
})

console.log('Account found by provider+providerAccountId:', !!account)
if (account) {
  console.log('User ID:', account.user.id)
  console.log('User email:', account.user.email)
} else {
  // Try finding by email
  const userByEmail = await prisma.user.findUnique({ where: { email: 'dealermolina@gmail.com' } })
  console.log('User by email:', !!userByEmail)
  if (userByEmail) {
    console.log('Has Google account?')
    const googleAccounts = await prisma.account.findMany({ where: { userId: userByEmail.id, provider: 'google' } })
    console.log('Google accounts for user:', googleAccounts.length)
    console.log('Account IDs:', googleAccounts.map(a => a.providerAccountId))
  }
}

// Also try: does the Account model have the correct composite key?
const allAccounts = await prisma.account.findMany({ take: 5 })
console.log('\nSample accounts (first 5):')
allAccounts.forEach(a => {
  console.log(`  ${a.provider}:${a.providerAccountId} -> user ${a.userId}`)
})

await prisma.$disconnect()
