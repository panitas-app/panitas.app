import type { NextAuthConfig } from "next-auth"
import { prisma } from "@/lib/prisma"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google" && profile?.email) {
        console.log("[auth] Google sign-in:", { email: profile.email, sub: account.providerAccountId })

        // Manually link account if user exists by email but no Google account linked
        const existingUser = await prisma.user.findUnique({ where: { email: profile.email } })
        if (existingUser) {
          const existingAccount = await prisma.account.findFirst({
            where: { userId: existingUser.id, provider: "google" },
          })
          if (!existingAccount) {
            console.log("[auth] Linking Google account to existing user:", existingUser.id)
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | null | undefined,
              },
            })
          }
        }
        return true
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl + "/dashboard"
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id
      return token
    },
  },
} satisfies NextAuthConfig
