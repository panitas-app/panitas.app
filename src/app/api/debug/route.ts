import { NextResponse } from "next/server"

export async function GET() {
  const vars = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "✓ set" : "✗ missing",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✓ set" : "✗ missing",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✓ set" : "✗ missing",
    DATABASE_URL: process.env.DATABASE_URL ? "✓ set" : "✗ missing",
    DIRECT_URL: process.env.DIRECT_URL ? "✓ set" : "✗ missing",
    ADMIN_SECRET: process.env.ADMIN_SECRET ? "✓ set" : "✗ missing",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  }
  return NextResponse.json(vars)
}
