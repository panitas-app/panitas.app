import { Prisma, PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type AppointmentFilters = {
  negocioId: string
  date?: string | Date
  agendaId?: string
  employeeId?: string
  serviceId?: string
  branchId?: string
  status?: string
}

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: { agenda: true; service: true; branch: true; employee: true }
}>

export class AgendaRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private buildWhere(filters: AppointmentFilters): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = { negocioId: filters.negocioId }
    if (filters.date) where.date = filters.date
    if (filters.agendaId) where.agendaId = filters.agendaId
    if (filters.employeeId) where.employeeId = filters.employeeId
    if (filters.serviceId) where.serviceId = filters.serviceId
    if (filters.branchId) where.branchId = filters.branchId
    if (filters.status) where.status = filters.status
    return where
  }

  list(filters: AppointmentFilters) {
    return this.db.appointment.findMany({
      where: this.buildWhere(filters),
      include: {
        service: true,
        employee: { select: { id: true, name: true, photo: true } },
      },
      orderBy: { time: "asc" },
    })
  }

  findById(id: string) {
    return this.db.appointment.findUnique({
      where: { id },
      include: { agenda: true, service: true, branch: true, employee: true },
    })
  }

  findByIdWithService(id: string) {
    return this.db.appointment.findUnique({
      where: { id },
      include: { service: true },
    })
  }

  findAgendaById(id: string) {
    return this.db.agenda.findUnique({ where: { id } })
  }

  findAgendaByNegocioId(negocioId: string) {
    return this.db.agenda.findFirst({
      where: { negocioId },
      select: { id: true },
    })
  }

  findStoreBySlug(slug: string) {
    return this.db.store.findUnique({
      where: { slug, isActive: true },
      select: { negocioId: true },
    })
  }

  findNegocioById(id: string) {
    return this.db.negocio.findUnique({
      where: { id },
      select: { nombre: true, userId: true },
    })
  }

  findUserEmail(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
  }

  countConflict(filters: {
    agendaId: string
    date: string
    time: string
    id?: string
    statuses?: string[]
  }) {
    const { agendaId, date, time, id, statuses } = filters
    return this.db.appointment.count({
      where: {
        agendaId,
        date,
        time,
        id: id ? { not: id } : undefined,
        status: statuses ? { in: statuses } : undefined,
      },
    })
  }

  create(data: Prisma.AppointmentUncheckedCreateInput) {
    return this.db.appointment.create({ data })
  }

  update(id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return this.db.appointment.update({ where: { id }, data })
  }

  delete(id: string) {
    return this.db.appointment.delete({ where: { id } })
  }
}
