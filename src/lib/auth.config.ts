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
      try {
        if (account?.provider === "google" && profile?.email) {
          const existingUser = await prisma.user.findUnique({ where: { email: profile.email } })
          if (existingUser) {
            const isNewUser = Date.now() - existingUser.createdAt.getTime() < 30000
            if (isNewUser) {
              enviarBienvenida(profile.email, profile.name || "Usuario")
                .catch(e => console.error("[welcome email error]", e))
            }

            const existingAccount = await prisma.account.findUnique({
              where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId as string } },
            })
            if (!existingAccount) {
              try {
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
              } catch (err) {
                console.error("[auth] FAILED to create Account:", err)
                return true
              }
            }
          }
          return true
        }
        return true
      } catch (error) {
        console.error("[signIn] Error in Google sign-in callback:", error)
        return true
      }
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        if (url === "/" || url === "/login") return `${baseUrl}/choose-plan`
        return `${baseUrl}${url}`
      }
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/choose-plan`
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
