import type { NextAuthConfig } from "next-auth"
import { prisma } from "@/lib/prisma"
import { enviarBienvenida } from "@/lib/email"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          include: { accounts: true },
        }).catch(() => null)

        if (existingUser) {
          const hasGoogleAccount = existingUser.accounts.some(a => a.provider === "google")
          if (!hasGoogleAccount) {
            enviarBienvenida(profile.email, profile.name || "Usuario")
              .catch(e => console.error("[welcome email error]", e))
          }
        }
        return true
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (url === baseUrl) return baseUrl
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        (session.user as any).id = token.sub
        ;(session.user as any).is_email_verified = token.is_email_verified ?? false
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Without adapter, Google sign-in gives us Google's profile ID, not our DB ID.
        // Resolve the correct DB user ID by email for OAuth providers.
        if (account?.provider === "google" && user.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, is_email_verified: true },
          }).catch(() => null)
          if (dbUser) {
            token.sub = dbUser.id
            ;(token as any).is_email_verified = dbUser.is_email_verified ?? false
            return token
          }
        }
        token.sub = user.id
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { is_email_verified: true },
          })
          ;(token as any).is_email_verified = dbUser?.is_email_verified ?? false
        } catch {
          ;(token as any).is_email_verified = false
        }
      }
      return token
    },
  },
} satisfies NextAuthConfig
