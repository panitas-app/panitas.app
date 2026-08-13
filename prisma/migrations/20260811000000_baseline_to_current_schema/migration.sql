-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "rescheduleHistory" JSONB;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastAutomationContactedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "automationPostPurchaseSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creditStatus" TEXT DEFAULT 'active',
ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderPayment" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "lastStockAlert" TIMESTAMP(3),
ADD COLUMN     "productType" TEXT NOT NULL DEFAULT 'physical';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "showBolivares" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "StoreSubscription" ADD COLUMN     "installmentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentMode" TEXT,
ADD COLUMN     "renewalSentAt" TIMESTAMP(3),
ADD COLUMN     "secondPaymentBankOrigin" TEXT,
ADD COLUMN     "secondPaymentDue" TIMESTAMP(3),
ADD COLUMN     "secondPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secondPaymentPaidAt" TIMESTAMP(3),
ADD COLUMN     "secondPaymentReceipt" TEXT,
ADD COLUMN     "secondPaymentReference" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "CollectionSettings" (
    "id" TEXT NOT NULL,
    "paymentMethods" TEXT NOT NULL DEFAULT '[]',
    "defaultLevel" INTEGER NOT NULL DEFAULT 2,
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "CollectionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTemplate" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "body" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "CollectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionContactLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "category" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "templateName" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "CollectionContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "documentRef" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceId" TEXT,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalProduct" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "downloadLimit" INTEGER NOT NULL DEFAULT 5,
    "expirationDays" INTEGER NOT NULL DEFAULT 30,
    "instructions" TEXT,
    "purchaseMessage" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "DigitalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalDelivery" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 5,
    "firstDownloadedAt" TIMESTAMP(3),
    "lastDownloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderItemId" TEXT NOT NULL,

    CONSTRAINT "DigitalDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotentialClient" (
    "id" TEXT NOT NULL,
    "nombreNegocio" TEXT NOT NULL,
    "propietario" TEXT NOT NULL,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "paginaWeb" TEXT,
    "ciudad" TEXT,
    "estado" TEXT,
    "pais" TEXT DEFAULT 'Venezuela',
    "direccion" TEXT,
    "categoria" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "estadoProspecto" TEXT NOT NULL DEFAULT 'nuevo',
    "puntuacion" INTEGER NOT NULL DEFAULT 0,
    "temperatura" TEXT NOT NULL DEFAULT 'frio',
    "notas" TEXT,
    "convertidoAt" TIMESTAMP(3),
    "convertidoUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PotentialClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotentialClientActivity" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "duracionMin" INTEGER,
    "fechaProx" TIMESTAMP(3),
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,

    CONSTRAINT "PotentialClientActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotentialClientFile" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "size" INTEGER,
    "esFoto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,

    CONSTRAINT "PotentialClientFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotentialClientReminder" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,

    CONSTRAINT "PotentialClientReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSection" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "route" TEXT,
    "guiaVendedor" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'questions',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuestion" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "subtexto" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'radio',
    "opciones" TEXT,
    "requerida" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "puntaje" TEXT,
    "painDetected" TEXT,
    "salesArgument" TEXT,
    "condicionLogica" TEXT,
    "categoria" TEXT,
    "placeholder" TEXT,
    "maxChars" INTEGER,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionId" TEXT NOT NULL,

    CONSTRAINT "SalesQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSession" (
    "id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_curso',
    "puntuacion" INTEGER NOT NULL DEFAULT 0,
    "temperatura" TEXT NOT NULL DEFAULT 'frio',
    "planSeleccionado" TEXT,
    "routeSeleccionada" TEXT,
    "planRecomendado" TEXT,
    "resumen" TEXT,
    "objeciones" TEXT,
    "notasAdicionales" TEXT,
    "completadaAt" TIMESTAMP(3),
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prospectId" TEXT NOT NULL,
    "sectionId" TEXT,

    CONSTRAINT "SalesSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAnswer" (
    "id" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "valorJson" TEXT,
    "puntaje" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "SalesAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesScoringRule" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "campo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL DEFAULT 0,
    "operador" TEXT NOT NULL DEFAULT 'equals',
    "route" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPlanRecommendation" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "route" TEXT,
    "minPuntuacion" INTEGER NOT NULL DEFAULT 0,
    "maxPuntuacion" INTEGER,
    "condiciones" TEXT,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesPlanRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerSession" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "deviceName" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nueva conversaci├│n',
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "negocioId" TEXT,
    "contextState" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxChannel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "config" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "config" TEXT NOT NULL DEFAULT '{}',
    "externalRef" TEXT,
    "errorMessage" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastHealthAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxConversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'nueva',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "externalRef" TEXT,
    "customerId" TEXT,
    "assignedToId" TEXT,
    "metadata" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "authorId" TEXT,
    "senderName" TEXT NOT NULL DEFAULT '',
    "recipient" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "attachments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "externalId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "name" TEXT NOT NULL DEFAULT '',
    "identifier" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxConversationTag" (
    "conversationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxConversationTag_pkey" PRIMARY KEY ("conversationId","tagId")
);

-- CreateTable
CREATE TABLE "InboxNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxAiSummary" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxAiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMemory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "negocioId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'store',
    "type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" TEXT,
    "source" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT,
    "ruleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "dataSource" TEXT,
    "suggestedAction" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "summary" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'published',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCategory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeTag" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocumentCategory" (
    "documentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeDocumentCategory_pkey" PRIMARY KEY ("documentId","categoryId")
);

-- CreateTable
CREATE TABLE "KnowledgeDocumentTag" (
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeDocumentTag_pkey" PRIMARY KEY ("documentId","tagId")
);

-- CreateTable
CREATE TABLE "KnowledgeVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "changeNote" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeHistory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "documentId" TEXT,
    "action" TEXT NOT NULL,
    "title" TEXT,
    "userId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "chunk" TEXT NOT NULL,
    "vector" TEXT,
    "model" TEXT,
    "dimensions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttentionItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'new',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "source" TEXT NOT NULL DEFAULT 'detector',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT,
    "metadata" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "storeId" TEXT NOT NULL,

    CONSTRAINT "AttentionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttentionSettings" (
    "id" TEXT NOT NULL,
    "enabledTypes" TEXT NOT NULL DEFAULT '[]',
    "minPriority" TEXT NOT NULL DEFAULT 'low',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "AttentionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "hashedSecret" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIdempotency" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIdempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryStatus" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "latencyMs" INTEGER,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extension" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'api_integration',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "configuration" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSettings_storeId_key" ON "CollectionSettings"("storeId");

-- CreateIndex
CREATE INDEX "CollectionSettings_storeId_idx" ON "CollectionSettings"("storeId");

-- CreateIndex
CREATE INDEX "CollectionTemplate_storeId_category_idx" ON "CollectionTemplate"("storeId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionTemplate_storeId_category_name_key" ON "CollectionTemplate"("storeId", "category", "name");

-- CreateIndex
CREATE INDEX "CollectionContactLog_storeId_createdAt_idx" ON "CollectionContactLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "CollectionContactLog_storeId_status_idx" ON "CollectionContactLog"("storeId", "status");

-- CreateIndex
CREATE INDEX "CollectionContactLog_orderId_idx" ON "CollectionContactLog"("orderId");

-- CreateIndex
CREATE INDEX "CollectionContactLog_customerId_idx" ON "CollectionContactLog"("customerId");

-- CreateIndex
CREATE INDEX "Supplier_storeId_idx" ON "Supplier"("storeId");

-- CreateIndex
CREATE INDEX "Supplier_storeId_isActive_idx" ON "Supplier"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_storeId_name_key" ON "Supplier"("storeId", "name");

-- CreateIndex
CREATE INDEX "SupplierInvoice_storeId_idx" ON "SupplierInvoice"("storeId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_storeId_date_idx" ON "SupplierInvoice"("storeId", "date");

-- CreateIndex
CREATE INDEX "SupplierInvoice_storeId_status_idx" ON "SupplierInvoice"("storeId", "status");

-- CreateIndex
CREATE INDEX "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_storeId_idx" ON "SupplierPayment"("storeId");

-- CreateIndex
CREATE INDEX "SupplierPayment_storeId_date_idx" ON "SupplierPayment"("storeId", "date");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_invoiceId_idx" ON "SupplierPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalProduct_productId_key" ON "DigitalProduct"("productId");

-- CreateIndex
CREATE INDEX "DigitalProduct_productId_idx" ON "DigitalProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalDelivery_token_key" ON "DigitalDelivery"("token");

-- CreateIndex
CREATE INDEX "DigitalDelivery_token_idx" ON "DigitalDelivery"("token");

-- CreateIndex
CREATE INDEX "DigitalDelivery_orderItemId_idx" ON "DigitalDelivery"("orderItemId");

-- CreateIndex
CREATE INDEX "PotentialClient_estadoProspecto_idx" ON "PotentialClient"("estadoProspecto");

-- CreateIndex
CREATE INDEX "PotentialClient_categoria_idx" ON "PotentialClient"("categoria");

-- CreateIndex
CREATE INDEX "PotentialClient_ciudad_idx" ON "PotentialClient"("ciudad");

-- CreateIndex
CREATE INDEX "PotentialClient_createdAt_idx" ON "PotentialClient"("createdAt");

-- CreateIndex
CREATE INDEX "PotentialClientActivity_prospectId_fecha_idx" ON "PotentialClientActivity"("prospectId", "fecha");

-- CreateIndex
CREATE INDEX "PotentialClientFile_prospectId_idx" ON "PotentialClientFile"("prospectId");

-- CreateIndex
CREATE INDEX "PotentialClientReminder_prospectId_fecha_idx" ON "PotentialClientReminder"("prospectId", "fecha");

-- CreateIndex
CREATE INDEX "PotentialClientReminder_completado_fecha_idx" ON "PotentialClientReminder"("completado", "fecha");

-- CreateIndex
CREATE INDEX "SalesSection_orden_idx" ON "SalesSection"("orden");

-- CreateIndex
CREATE INDEX "SalesSection_route_idx" ON "SalesSection"("route");

-- CreateIndex
CREATE INDEX "SalesQuestion_sectionId_orden_idx" ON "SalesQuestion"("sectionId", "orden");

-- CreateIndex
CREATE INDEX "SalesQuestion_categoria_idx" ON "SalesQuestion"("categoria");

-- CreateIndex
CREATE INDEX "SalesSession_prospectId_idx" ON "SalesSession"("prospectId");

-- CreateIndex
CREATE INDEX "SalesSession_estado_idx" ON "SalesSession"("estado");

-- CreateIndex
CREATE INDEX "SalesSession_completadaAt_idx" ON "SalesSession"("completadaAt");

-- CreateIndex
CREATE INDEX "SalesAnswer_sessionId_idx" ON "SalesAnswer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesAnswer_sessionId_questionId_key" ON "SalesAnswer"("sessionId", "questionId");

-- CreateIndex
CREATE INDEX "SalesScoringRule_activo_idx" ON "SalesScoringRule"("activo");

-- CreateIndex
CREATE INDEX "SalesPlanRecommendation_plan_idx" ON "SalesPlanRecommendation"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerSession_token_key" ON "ScannerSession"("token");

-- CreateIndex
CREATE INDEX "ScannerSession_storeId_status_idx" ON "ScannerSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "ScannerSession_token_idx" ON "ScannerSession"("token");

-- CreateIndex
CREATE INDEX "ScannerSession_expiresAt_idx" ON "ScannerSession"("expiresAt");

-- CreateIndex
CREATE INDEX "ScannerEvent_sessionId_createdAt_idx" ON "ScannerEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_userId_storeId_updatedAt_idx" ON "Conversation"("userId", "storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_storeId_updatedAt_idx" ON "Conversation"("storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_negocioId_idx" ON "Conversation"("negocioId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxChannel_storeId_isActive_idx" ON "InboxChannel"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InboxChannel_storeId_type_key" ON "InboxChannel"("storeId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_channelId_key" ON "ChannelConnection"("channelId");

-- CreateIndex
CREATE INDEX "ChannelConnection_storeId_status_idx" ON "ChannelConnection"("storeId", "status");

-- CreateIndex
CREATE INDEX "ChannelConnection_externalRef_idx" ON "ChannelConnection"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_storeId_channelId_key" ON "ChannelConnection"("storeId", "channelId");

-- CreateIndex
CREATE INDEX "InboxConversation_storeId_status_updatedAt_idx" ON "InboxConversation"("storeId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "InboxConversation_storeId_updatedAt_idx" ON "InboxConversation"("storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "InboxConversation_storeId_externalRef_idx" ON "InboxConversation"("storeId", "externalRef");

-- CreateIndex
CREATE INDEX "InboxConversation_customerId_idx" ON "InboxConversation"("customerId");

-- CreateIndex
CREATE INDEX "InboxConversation_assignedToId_idx" ON "InboxConversation"("assignedToId");

-- CreateIndex
CREATE INDEX "InboxConversation_channelId_idx" ON "InboxConversation"("channelId");

-- CreateIndex
CREATE INDEX "InboxMessage_conversationId_createdAt_idx" ON "InboxMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxMessage_storeId_createdAt_idx" ON "InboxMessage"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "InboxMessage_storeId_sender_idx" ON "InboxMessage"("storeId", "sender");

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessage_storeId_externalId_key" ON "InboxMessage"("storeId", "externalId");

-- CreateIndex
CREATE INDEX "InboxParticipant_conversationId_idx" ON "InboxParticipant"("conversationId");

-- CreateIndex
CREATE INDEX "InboxParticipant_storeId_idx" ON "InboxParticipant"("storeId");

-- CreateIndex
CREATE INDEX "InboxTag_storeId_idx" ON "InboxTag"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "InboxTag_storeId_name_key" ON "InboxTag"("storeId", "name");

-- CreateIndex
CREATE INDEX "InboxNote_conversationId_idx" ON "InboxNote"("conversationId");

-- CreateIndex
CREATE INDEX "InboxNote_storeId_idx" ON "InboxNote"("storeId");

-- CreateIndex
CREATE INDEX "InboxAiSummary_conversationId_kind_createdAt_idx" ON "InboxAiSummary"("conversationId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "InboxAiSummary_storeId_idx" ON "InboxAiSummary"("storeId");

-- CreateIndex
CREATE INDEX "BusinessMemory_storeId_scope_importance_idx" ON "BusinessMemory"("storeId", "scope", "importance");

-- CreateIndex
CREATE INDEX "BusinessMemory_storeId_type_idx" ON "BusinessMemory"("storeId", "type");

-- CreateIndex
CREATE INDEX "BusinessMemory_storeId_updatedAt_idx" ON "BusinessMemory"("storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "BusinessMemory_negocioId_idx" ON "BusinessMemory"("negocioId");

-- CreateIndex
CREATE INDEX "BusinessMemory_expiresAt_idx" ON "BusinessMemory"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMemory_storeId_key_key" ON "BusinessMemory"("storeId", "key");

-- CreateIndex
CREATE INDEX "Recommendation_storeId_status_createdAt_idx" ON "Recommendation"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_storeId_ruleId_createdAt_idx" ON "Recommendation"("storeId", "ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_storeId_createdAt_idx" ON "Recommendation"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_storeId_updatedAt_idx" ON "KnowledgeDocument"("storeId", "updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_storeId_status_idx" ON "KnowledgeDocument"("storeId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_storeId_type_idx" ON "KnowledgeDocument"("storeId", "type");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_storeId_createdAt_idx" ON "KnowledgeDocument"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeCategory_storeId_idx" ON "KnowledgeCategory"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCategory_storeId_slug_key" ON "KnowledgeCategory"("storeId", "slug");

-- CreateIndex
CREATE INDEX "KnowledgeTag_storeId_idx" ON "KnowledgeTag"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeTag_storeId_slug_key" ON "KnowledgeTag"("storeId", "slug");

-- CreateIndex
CREATE INDEX "KnowledgeDocumentCategory_categoryId_idx" ON "KnowledgeDocumentCategory"("categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeDocumentTag_tagId_idx" ON "KnowledgeDocumentTag"("tagId");

-- CreateIndex
CREATE INDEX "KnowledgeVersion_documentId_idx" ON "KnowledgeVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeVersion_documentId_version_key" ON "KnowledgeVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "KnowledgeHistory_storeId_createdAt_idx" ON "KnowledgeHistory"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeHistory_documentId_idx" ON "KnowledgeHistory"("documentId");

-- CreateIndex
CREATE INDEX "KnowledgeEmbedding_documentId_idx" ON "KnowledgeEmbedding"("documentId");

-- CreateIndex
CREATE INDEX "AttentionItem_storeId_status_createdAt_idx" ON "AttentionItem"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttentionItem_storeId_status_priority_idx" ON "AttentionItem"("storeId", "status", "priority");

-- CreateIndex
CREATE INDEX "AttentionItem_storeId_type_status_idx" ON "AttentionItem"("storeId", "type", "status");

-- CreateIndex
CREATE INDEX "AttentionItem_storeId_dedupeKey_idx" ON "AttentionItem"("storeId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AttentionItem_dedupeKey_idx" ON "AttentionItem"("dedupeKey");

-- CreateIndex
CREATE INDEX "AttentionItem_entityType_entityId_idx" ON "AttentionItem"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AttentionSettings_storeId_key" ON "AttentionSettings"("storeId");

-- CreateIndex
CREATE INDEX "AttentionSettings_storeId_idx" ON "AttentionSettings"("storeId");

-- CreateIndex
CREATE INDEX "ApiKey_storeId_idx" ON "ApiKey"("storeId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_storeId_status_idx" ON "ApiKey"("storeId", "status");

-- CreateIndex
CREATE INDEX "ApiIdempotency_storeId_key_idx" ON "ApiIdempotency"("storeId", "key");

-- CreateIndex
CREATE INDEX "ApiIdempotency_createdAt_idx" ON "ApiIdempotency"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIdempotency_storeId_key_key" ON "ApiIdempotency"("storeId", "key");

-- CreateIndex
CREATE INDEX "WebhookSubscription_storeId_idx" ON "WebhookSubscription"("storeId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_storeId_status_idx" ON "WebhookSubscription"("storeId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_storeId_createdAt_idx" ON "WebhookDelivery"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_storeId_status_idx" ON "WebhookDelivery"("storeId", "status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_subscriptionId_createdAt_idx" ON "WebhookDelivery"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_subscriptionId_eventId_key" ON "WebhookDelivery"("subscriptionId", "eventId");

-- CreateIndex
CREATE INDEX "Extension_storeId_idx" ON "Extension"("storeId");

-- CreateIndex
CREATE INDEX "Extension_storeId_status_idx" ON "Extension"("storeId", "status");

-- CreateIndex
CREATE INDEX "Collection_storeId_idx" ON "Collection"("storeId");

-- CreateIndex
CREATE INDEX "Expense_storeId_idx" ON "Expense"("storeId");

-- CreateIndex
CREATE INDEX "Expense_storeId_date_idx" ON "Expense"("storeId", "date");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");

-- CreateIndex
CREATE INDEX "OrderPayment_paymentAccountId_idx" ON "OrderPayment"("paymentAccountId");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_storeId_isActive_idx" ON "Product"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- AddForeignKey
ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTemplate" ADD CONSTRAINT "CollectionTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalProduct" ADD CONSTRAINT "DigitalProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDelivery" ADD CONSTRAINT "DigitalDelivery_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotentialClientActivity" ADD CONSTRAINT "PotentialClientActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotentialClientFile" ADD CONSTRAINT "PotentialClientFile_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PotentialClientReminder" ADD CONSTRAINT "PotentialClientReminder_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuestion" ADD CONSTRAINT "SalesQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SalesSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SalesSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnswer" ADD CONSTRAINT "SalesAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalesSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAnswer" ADD CONSTRAINT "SalesAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SalesQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerEvent" ADD CONSTRAINT "ScannerEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScannerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxChannel" ADD CONSTRAINT "InboxChannel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "InboxChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "InboxChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxParticipant" ADD CONSTRAINT "InboxParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxParticipant" ADD CONSTRAINT "InboxParticipant_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxTag" ADD CONSTRAINT "InboxTag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversationTag" ADD CONSTRAINT "InboxConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxConversationTag" ADD CONSTRAINT "InboxConversationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "InboxTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAiSummary" ADD CONSTRAINT "InboxAiSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxAiSummary" ADD CONSTRAINT "InboxAiSummary_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCategory" ADD CONSTRAINT "KnowledgeCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTag" ADD CONSTRAINT "KnowledgeTag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocumentCategory" ADD CONSTRAINT "KnowledgeDocumentCategory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocumentCategory" ADD CONSTRAINT "KnowledgeDocumentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocumentTag" ADD CONSTRAINT "KnowledgeDocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocumentTag" ADD CONSTRAINT "KnowledgeDocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KnowledgeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVersion" ADD CONSTRAINT "KnowledgeVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeHistory" ADD CONSTRAINT "KnowledgeHistory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeHistory" ADD CONSTRAINT "KnowledgeHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEmbedding" ADD CONSTRAINT "KnowledgeEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionItem" ADD CONSTRAINT "AttentionItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttentionSettings" ADD CONSTRAINT "AttentionSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIdempotency" ADD CONSTRAINT "ApiIdempotency_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extension" ADD CONSTRAINT "Extension_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

