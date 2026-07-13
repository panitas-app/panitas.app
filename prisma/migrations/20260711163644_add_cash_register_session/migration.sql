/*
  Warnings:

  - You are about to drop the column `storeId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `BlockedSlot` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `ServiceCategory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_storeId_fkey";

-- DropForeignKey
ALTER TABLE "BlockedSlot" DROP CONSTRAINT "BlockedSlot_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Service" DROP CONSTRAINT "Service_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceCategory" DROP CONSTRAINT "ServiceCategory_storeId_fkey";

-- DropIndex
DROP INDEX "Appointment_storeId_date_idx";

-- DropIndex
DROP INDEX "BlockedSlot_storeId_date_idx";

-- DropIndex
DROP INDEX "Schedule_storeId_dayOfWeek_idx";

-- DropIndex
DROP INDEX "Service_storeId_idx";

-- DropIndex
DROP INDEX "ServiceCategory_storeId_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "storeId",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "employeeId" TEXT,
ALTER COLUMN "agendaId" DROP DEFAULT,
ALTER COLUMN "negocioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BcvRate" ADD COLUMN     "publishedDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BlockedSlot" DROP COLUMN "storeId",
ALTER COLUMN "agendaId" DROP DEFAULT,
ALTER COLUMN "negocioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "estado" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "pais" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashRegisterSessionId" TEXT,
ADD COLUMN     "creditDays" INTEGER,
ADD COLUMN     "creditTerm" TEXT,
ADD COLUMN     "downPayment" DOUBLE PRECISION,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "posPin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerId" TEXT,
ADD COLUMN     "sellerName" TEXT,
ADD COLUMN     "totalCredito" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlanFeature" ALTER COLUMN "label" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "unidadBase" TEXT NOT NULL DEFAULT 'Unidad';

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "storeId",
ALTER COLUMN "agendaId" DROP DEFAULT,
ALTER COLUMN "negocioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "storeId",
ADD COLUMN     "image" TEXT,
ALTER COLUMN "agendaId" DROP DEFAULT,
ALTER COLUMN "negocioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServiceCategory" DROP COLUMN "storeId",
ALTER COLUMN "agendaId" DROP DEFAULT,
ALTER COLUMN "negocioId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "creditDays" TEXT NOT NULL DEFAULT '5,10,15,30',
ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "posPin" TEXT,
ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "youtube" TEXT;

-- AlterTable
ALTER TABLE "StoreSubscription" ADD COLUMN     "paymentProofHash" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "token_expires_at" TIMESTAMP(3),
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "verification_token" TEXT;

-- CreateTable
CREATE TABLE "StoreVisit" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "StoreVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSource" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "TrafficSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegisterSession" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "notes" TEXT,
    "totalCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTransfer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPagoMovil" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDivisas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCard" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "storeId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hours" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicSlug" TEXT,
    "remunerationType" TEXT,
    "commissionDefault" DECIMAL(12,2),
    "salary" DECIMAL(12,2),
    "rentalAmount" DECIMAL(12,2),
    "mixedSalary" DECIMAL(12,2),
    "mixedCommission" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeService" (
    "employeeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "commissionType" TEXT,
    "commissionValue" DECIMAL(12,2),

    CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("employeeId","serviceId")
);

-- CreateTable
CREATE TABLE "EmployeeSchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmployeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCommission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "orderItemId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "EmployeeCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "EmployeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPresentation" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "multiplier" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductPresentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "concept" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "documentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionType" TEXT,
    "commissionValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerCommission" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "sellerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "SellerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreVisit_storeId_idx" ON "StoreVisit"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreVisit_storeId_date_key" ON "StoreVisit"("storeId", "date");

-- CreateIndex
CREATE INDEX "TrafficSource_storeId_idx" ON "TrafficSource"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficSource_storeId_date_source_key" ON "TrafficSource"("storeId", "date", "source");

-- CreateIndex
CREATE INDEX "Installment_orderId_idx" ON "Installment"("orderId");

-- CreateIndex
CREATE INDEX "Installment_status_idx" ON "Installment"("status");

-- CreateIndex
CREATE INDEX "CashRegisterSession_storeId_status_idx" ON "CashRegisterSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "CashRegisterSession_storeId_createdAt_idx" ON "CashRegisterSession"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSetting_key_key" ON "AdminSetting"("key");

-- CreateIndex
CREATE INDEX "Branch_storeId_idx" ON "Branch"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_storeId_slug_key" ON "Branch"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_publicSlug_key" ON "Employee"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_storeId_idx" ON "Employee"("storeId");

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE INDEX "EmployeeSchedule_employeeId_idx" ON "EmployeeSchedule"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCommission_employeeId_idx" ON "EmployeeCommission"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCommission_status_idx" ON "EmployeeCommission"("status");

-- CreateIndex
CREATE INDEX "EmployeePayment_employeeId_idx" ON "EmployeePayment"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePayment_date_idx" ON "EmployeePayment"("date");

-- CreateIndex
CREATE INDEX "ProductPresentation_productId_idx" ON "ProductPresentation"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPresentation_productId_label_key" ON "ProductPresentation"("productId", "label");

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_storeId_createdAt_idx" ON "StockMovement"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Seller_storeId_idx" ON "Seller"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_storeId_username_key" ON "Seller"("storeId", "username");

-- CreateIndex
CREATE INDEX "SellerCommission_sellerId_idx" ON "SellerCommission"("sellerId");

-- CreateIndex
CREATE INDEX "SellerCommission_orderId_idx" ON "SellerCommission"("orderId");

-- CreateIndex
CREATE INDEX "Appointment_branchId_idx" ON "Appointment"("branchId");

-- CreateIndex
CREATE INDEX "Appointment_employeeId_idx" ON "Appointment"("employeeId");

-- CreateIndex
CREATE INDEX "Order_storeId_status_createdAt_idx" ON "Order"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_storeId_paymentStatus_idx" ON "Order"("storeId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");

-- CreateIndex
CREATE INDEX "Order_cashRegisterSessionId_idx" ON "Order"("cashRegisterSessionId");

-- CreateIndex
CREATE INDEX "OrderItem_employeeId_idx" ON "OrderItem"("employeeId");

-- AddForeignKey
ALTER TABLE "StoreVisit" ADD CONSTRAINT "StoreVisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficSource" ADD CONSTRAINT "TrafficSource_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashRegisterSessionId_fkey" FOREIGN KEY ("cashRegisterSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSchedule" ADD CONSTRAINT "EmployeeSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCommission" ADD CONSTRAINT "EmployeeCommission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayment" ADD CONSTRAINT "EmployeePayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPresentation" ADD CONSTRAINT "ProductPresentation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommission" ADD CONSTRAINT "SellerCommission_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommission" ADD CONSTRAINT "SellerCommission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
