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
    async signIn({ account, profile, user }) {
      if (account?.provider === "google" && profile?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          include: { accounts: true },
        }).catch(() => null)

        if (existingUser) {
          // Manually link Google account if not already linked
          const hasGoogleAccount = existingUser.accounts.some(a => a.provider === "google")
          if (!hasGoogleAccount && account.providerAccountId) {
            try {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type || "oauth",
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
              })
            } catch (err: any) {
              if (err?.code !== "P2002") {
                console.error("[auth] Failed to link Google account:", err)
              }
            }
          }
          enviarBienvenida(profile.email, profile.name || "Usuario")
            .catch(e => console.error("[welcome email error]", e))
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
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        // Fetch is_email_verified from DB for the logged-in user
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
