-- CreateTable: Plan
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioUsd" DOUBLE PRECISION NOT NULL,
    "precioUsdAnual" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plan_nombre_key" ON "Plan"("nombre");

-- CreateTable: PlanFeature
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "tipo" TEXT NOT NULL DEFAULT 'boolean',
    "valor" TEXT,
    "planId" TEXT NOT NULL,
    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanFeature_planId_key_key" ON "PlanFeature"("planId", "key");

ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Negocio
CREATE TABLE "Negocio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "logo" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "planId" TEXT NOT NULL,
    "modalidad" TEXT,
    "planEstado" TEXT NOT NULL DEFAULT 'activo',
    "planInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planVencimiento" TIMESTAMP(3),
    "planRenovacionAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Negocio_slug_key" ON "Negocio"("slug");
CREATE UNIQUE INDEX "Negocio_userId_key" ON "Negocio"("userId");
CREATE INDEX "Negocio_planEstado_idx" ON "Negocio"("planEstado");
CREATE INDEX "Negocio_planVencimiento_idx" ON "Negocio"("planVencimiento");

ALTER TABLE "Negocio" ADD CONSTRAINT "Negocio_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Negocio" ADD CONSTRAINT "Negocio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: NegocioPlanHistory
CREATE TABLE "NegocioPlanHistory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planNombre" TEXT NOT NULL,
    "modalidad" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "periodo" TEXT NOT NULL DEFAULT 'monthly',
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "negocioId" TEXT NOT NULL,
    CONSTRAINT "NegocioPlanHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NegocioPlanHistory_negocioId_createdAt_idx" ON "NegocioPlanHistory"("negocioId", "createdAt");

ALTER TABLE "NegocioPlanHistory" ADD CONSTRAINT "NegocioPlanHistory_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Agenda
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "logo" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "horario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "negocioId" TEXT NOT NULL,
    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Agenda_negocioId_slug_key" ON "Agenda"("negocioId", "slug");
CREATE INDEX "Agenda_negocioId_idx" ON "Agenda"("negocioId");

ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Store add negocioId
ALTER TABLE "Store" ADD COLUMN "negocioId" TEXT;
ALTER TABLE "Store" ADD CONSTRAINT "Store_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Store_negocioId_key" ON "Store"("negocioId");

-- AlterTable: Service add agendaId, negocioId; drop storeId FK
ALTER TABLE "Service" ADD COLUMN "agendaId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Service" ADD COLUMN "negocioId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Service_agendaId_idx" ON "Service"("agendaId");
CREATE INDEX "Service_negocioId_idx" ON "Service"("negocioId");
ALTER TABLE "Service" ADD CONSTRAINT "Service_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ServiceCategory add agendaId, negocioId; drop storeId FK
ALTER TABLE "ServiceCategory" ADD COLUMN "agendaId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ServiceCategory" ADD COLUMN "negocioId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "ServiceCategory_agendaId_idx" ON "ServiceCategory"("agendaId");
CREATE INDEX "ServiceCategory_negocioId_idx" ON "ServiceCategory"("negocioId");
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Schedule add agendaId, negocioId; drop storeId FK
ALTER TABLE "Schedule" ADD COLUMN "agendaId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Schedule" ADD COLUMN "negocioId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Schedule_agendaId_dayOfWeek_idx" ON "Schedule"("agendaId", "dayOfWeek");
CREATE INDEX "Schedule_negocioId_idx" ON "Schedule"("negocioId");
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: BlockedSlot add agendaId, negocioId; drop storeId FK
ALTER TABLE "BlockedSlot" ADD COLUMN "agendaId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BlockedSlot" ADD COLUMN "negocioId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "BlockedSlot_agendaId_date_idx" ON "BlockedSlot"("agendaId", "date");
CREATE INDEX "BlockedSlot_negocioId_idx" ON "BlockedSlot"("negocioId");
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Appointment add agendaId, negocioId; drop storeId FK
ALTER TABLE "Appointment" ADD COLUMN "agendaId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Appointment" ADD COLUMN "negocioId" TEXT NOT NULL DEFAULT '';
CREATE INDEX "Appointment_agendaId_date_idx" ON "Appointment"("agendaId", "date");
CREATE INDEX "Appointment_negocioId_idx" ON "Appointment"("negocioId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
