import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const empresa = searchParams.get("empresa") || undefined
  const estado = searchParams.get("estado") || undefined

  try {
    // Si no se pide un estado ni una empresa, solo devolvemos las listas agrupadas principales (muy rápido)
    if (!estado && !empresa) {
      const [empresas, estados] = await Promise.all([
        prisma.agenciaEnvio.findMany({
          where: { activa: true },
          select: { empresa: true },
          distinct: ["empresa"],
          orderBy: { empresa: "asc" },
        }),
        prisma.agenciaEnvio.findMany({
          where: { activa: true },
          select: { estado: true },
          distinct: ["estado"],
          orderBy: { estado: "asc" },
        }),
      ])

      return NextResponse.json({
        agencies: [],
        empresas: empresas.map((e) => e.empresa),
        estados: estados.map((e) => e.estado),
      })
    }

    // Si se proporciona el estado pero no la empresa, devolvemos las empresas disponibles en ese estado
    if (estado && !empresa) {
      const empresasEnEstado = await prisma.agenciaEnvio.findMany({
        where: { activa: true, estado },
        select: { empresa: true },
        distinct: ["empresa"],
        orderBy: { empresa: "asc" },
      })

      return NextResponse.json({
        agencies: [],
        empresas: empresasEnEstado.map((e) => e.empresa),
        estados: [estado],
      })
    }

    // Si se especifican ambos, devolvemos únicamente las agencias/oficinas de esa combinación
    const agencies = await prisma.agenciaEnvio.findMany({
      where: {
        activa: true,
        estado,
        empresa,
      },
      orderBy: [{ ciudad: "asc" }, { agencia: "asc" }],
    })

    return NextResponse.json({
      agencies,
      empresas: [empresa],
      estados: [estado],
    })
  } catch (error: any) {
    console.error("API agencias error:", error)
    return NextResponse.json({ error: "Error al obtener las agencias" }, { status: 500 })
  }
}
