import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const KNOWN_SOURCES = ["direct", "social", "search", "whatsapp", "email", "qr"] as const
type Source = typeof KNOWN_SOURCES[number]

function classifySource(referrer: string | undefined, ref: string | undefined): Source {
  const r = (ref || "").toLowerCase()
  if (r === "whatsapp" || r === "wa" || r.includes("whatsapp")) return "whatsapp"
  if (r === "qr" || r === "qrcode") return "qr"
  if (r === "facebook" || r === "fb" || r === "instagram" || r === "ig" || r === "tiktok" || r === "twitter" || r === "linkedin" || r === "social") return "social"
  if (r === "google" || r === "bing" || r === "yahoo" || r === "search") return "search"
  if (r === "email" || r === "mail" || r === "gmail" || r === "outlook" || r === "hotmail") return "email"
  if (!referrer) return "direct"
  if (referrer.includes("facebook") || referrer.includes("instagram") || referrer.includes("twitter") || referrer.includes("tiktok") || referrer.includes("linkedin")) return "social"
  if (referrer.includes("google") || referrer.includes("bing") || referrer.includes("yahoo")) return "search"
  if (referrer.includes("wa.me") || referrer.includes("whatsapp")) return "whatsapp"
  if (referrer.includes("mail.") || referrer.includes("outlook") || referrer.includes("gmail") || referrer.includes("yahoo") || referrer.includes("hotmail")) return "email"
  return "direct"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const storeId = body.storeId as string | undefined
    if (!storeId) {
      return NextResponse.json({ error: "storeId requerido" }, { status: 400 })
    }

    const referrer = body.referrer as string | undefined
    const ref = body.ref as string | undefined
    const source = classifySource(referrer, ref)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.storeVisit.findUnique({
      where: { storeId_date: { storeId, date: today } },
    })

    if (existing) {
      await prisma.storeVisit.update({
        where: { id: existing.id },
        data: { count: existing.count + 1 },
      })
    } else {
      await prisma.storeVisit.create({
        data: { storeId, date: today, count: 1 },
      })
    }

    const sourceExisting = await prisma.trafficSource.findUnique({
      where: { storeId_date_source: { storeId, date: today, source } },
    })

    if (sourceExisting) {
      await prisma.trafficSource.update({
        where: { id: sourceExisting.id },
        data: { count: sourceExisting.count + 1 },
      })
    } else {
      await prisma.trafficSource.create({
        data: { storeId, date: today, source, count: 1 },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
