import { NextResponse } from "next/server"

export async function GET() {
  const envCheck = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretPrefix: process.env.AUTH_SECRET ? process.env.AUTH_SECRET.slice(0, 4) + "..." : null,
    hasNexauthUrl: !!process.env.NEXTAUTH_URL,
    nexauthUrl: process.env.NEXTAUTH_URL || null,
    hasAuthUrl: !!process.env.AUTH_URL,
    authUrl: process.env.AUTH_URL || null,
    vercel: !!process.env.VERCEL,
    vercelUrl: process.env.VERCEL_URL || null,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nodeEnv: process.env.NODE_ENV || null,
  }
  return NextResponse.json(envCheck)
}
