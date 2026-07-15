import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const totalUsers = await prisma.user.count()
    const totalNegocios = await prisma.negocio.count()
    const totalStores = await prisma.store.count()
    const totalMembers = await prisma.storeMember.count()
    const totalPlans = await prisma.plan.count()

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        negocio: {
          select: {
            id: true,
            planId: true,
            planEstado: true,
            slug: true,
          }
        },
        store: {
          select: {
            id: true,
            planType: true,
            planStatus: true,
            slug: true,
          }
        },
        memberships: {
          select: {
            id: true,
            role: true,
            storeId: true,
          }
        }
      }
    })

    const allPlans = await prisma.plan.findMany({
      select: {
        id: true,
        nombre: true,
        activo: true,
      }
    })

    // Check for duplicate slugs
    const negocioSlugs = await prisma.negocio.groupBy({
      by: ['slug'],
      _count: {
        slug: true
      },
      having: {
        slug: {
          _count: {
            gt: 1
          }
        }
      }
    })

    const storeSlugs = await prisma.store.groupBy({
      by: ['slug'],
      _count: {
        slug: true
      },
      having: {
        slug: {
          _count: {
            gt: 1
          }
        }
      }
    })

    const auditLogs = await prisma.auditLog.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      totals: {
        users: totalUsers,
        negocios: totalNegocios,
        stores: totalStores,
        members: totalMembers,
        plans: totalPlans,
      },
      recentUsers,
      allPlans,
      slugConflicts: {
        negocios: negocioSlugs,
        stores: storeSlugs,
      },
      auditLogs
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
      stack: error.stack
    }, { status: 500 })
  }
}
