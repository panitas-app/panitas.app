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
        const existingUser = await prisma.user.findUnique({ where: { email: profile.email } }).catch(() => null)
        if (existingUser) {
          enviarBienvenida(profile.email, profile.name || "Usuario")
            .catch(e => console.error("[welcome email error]", e))
        }
        return true
      }
      return true
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
