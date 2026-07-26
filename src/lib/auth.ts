import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { authConfig } from "./auth.config"

if (process.env.VERCEL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://panitas.app'
}

function validateEmail(email: unknown): string | null {
  if (typeof email !== "string") return null
  const trimmed = email.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null
}

const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true,
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: undefined,
  providers: [
    googleProvider,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = validateEmail(credentials?.email)
        if (!email || !credentials?.password || typeof credentials.password !== "string") return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user?.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase()

        // Find existing user
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        }).catch(() => null)

        if (existingUser) {
          // Link Google account if not already linked
          const hasGoogleAccount = existingUser.accounts.some(a => a.provider === "google")
          if (!hasGoogleAccount && account.providerAccountId) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type || "OAuth",
                provider: "google",
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: typeof account.session_state === "string" ? account.session_state : null,
              },
            }).catch(() => {})
          }
          // Attach user ID to the token by returning the user object
          return { id: existingUser.id, email: existingUser.email, name: existingUser.name } as any
        }

        // New user — create account + user
        const newUser = await prisma.user.create({
          data: {
            email,
            name: profile.name || null,
            emailVerified: new Date(),
          },
        })

        if (account.providerAccountId) {
          await prisma.account.create({
            data: {
              userId: newUser.id,
              type: account.type || "OAuth",
              provider: "google",
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: typeof account.session_state === "string" ? account.session_state : null,
            },
          }).catch(() => {})
        }

        return { id: newUser.id, email: newUser.email, name: newUser.name } as any
      }
      return true
    },
  },
})
