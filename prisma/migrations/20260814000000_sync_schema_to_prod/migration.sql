-- Generated automatically: idempotent baseline to sync schema<->prod DB

-- Adds missing objects only; never drops. (IF NOT EXISTS + guarded constraints)



ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS     "customerEmail" TEXT,
ADD COLUMN IF NOT EXISTS     "rescheduleHistory" JSONB;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS     "lastAutomationContactedAt" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS     "automationPostPurchaseSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS     "creditStatus" TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS     "deliveredAt" TIMESTAMP(3);

ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS     "notes" TEXT;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS     "barcode" TEXT,
ADD COLUMN IF NOT EXISTS     "lastStockAlert" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "productType" TEXT NOT NULL DEFAULT 'physical';

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS     "showBolivares" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "StoreSubscription" ADD COLUMN IF NOT EXISTS     "installmentAmount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS     "paymentMode" TEXT,
ADD COLUMN IF NOT EXISTS     "renewalSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "secondPaymentBankOrigin" TEXT,
ADD COLUMN IF NOT EXISTS     "secondPaymentDue" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "secondPaymentPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS     "secondPaymentPaidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "secondPaymentReceipt" TEXT,
ADD COLUMN IF NOT EXISTS     "secondPaymentReference" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS     "country" TEXT,
ADD COLUMN IF NOT EXISTS     "phone" TEXT;

CREATE TABLE IF NOT EXISTS "CollectionSettings" (
    "id" TEXT NOT NULL,
    "paymentMethods" TEXT NOT NULL DEFAULT '[]',
    "defaultLevel" INTEGER NOT NULL DEFAULT 2,
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "CollectionSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollectionTemplate" (
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

CREATE TABLE IF NOT EXISTS "CollectionContactLog" (
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

CREATE TABLE IF NOT EXISTS "Supplier" (
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

CREATE TABLE IF NOT EXISTS "SupplierInvoice" (
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

CREATE TABLE IF NOT EXISTS "SupplierPayment" (
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

CREATE TABLE IF NOT EXISTS "DigitalProduct" (
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

CREATE TABLE IF NOT EXISTS "DigitalDelivery" (
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

CREATE TABLE IF NOT EXISTS "PotentialClient" (
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

CREATE TABLE IF NOT EXISTS "PotentialClientActivity" (
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

CREATE TABLE IF NOT EXISTS "PotentialClientFile" (
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

CREATE TABLE IF NOT EXISTS "PotentialClientReminder" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prospectId" TEXT NOT NULL,

    CONSTRAINT "PotentialClientReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesSection" (
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

CREATE TABLE IF NOT EXISTS "SalesQuestion" (
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

CREATE TABLE IF NOT EXISTS "SalesSession" (
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

CREATE TABLE IF NOT EXISTS "SalesAnswer" (
    "id" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "valorJson" TEXT,
    "puntaje" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "SalesAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesScoringRule" (
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

CREATE TABLE IF NOT EXISTS "SalesPlanRecommendation" (
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

CREATE TABLE IF NOT EXISTS "ScannerSession" (
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

CREATE TABLE IF NOT EXISTS "ScannerEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Conversation" (
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

CREATE TABLE IF NOT EXISTS "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboxChannel" (
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

CREATE TABLE IF NOT EXISTS "ChannelConnection" (
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

CREATE TABLE IF NOT EXISTS "InboxConversation" (
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

CREATE TABLE IF NOT EXISTS "InboxMessage" (
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

CREATE TABLE IF NOT EXISTS "InboxParticipant" (
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

CREATE TABLE IF NOT EXISTS "InboxTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboxConversationTag" (
    "conversationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxConversationTag_pkey" PRIMARY KEY ("conversationId","tagId")
);

CREATE TABLE IF NOT EXISTS "InboxNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InboxAiSummary" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT NOT NULL,

    CONSTRAINT "InboxAiSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BusinessMemory" (
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

CREATE TABLE IF NOT EXISTS "Recommendation" (
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

CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
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

CREATE TABLE IF NOT EXISTS "KnowledgeCategory" (
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

CREATE TABLE IF NOT EXISTS "KnowledgeTag" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "KnowledgeDocumentCategory" (
    "documentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeDocumentCategory_pkey" PRIMARY KEY ("documentId","categoryId")
);

CREATE TABLE IF NOT EXISTS "KnowledgeDocumentTag" (
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeDocumentTag_pkey" PRIMARY KEY ("documentId","tagId")
);

CREATE TABLE IF NOT EXISTS "KnowledgeVersion" (
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

CREATE TABLE IF NOT EXISTS "KnowledgeHistory" (
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

CREATE TABLE IF NOT EXISTS "KnowledgeEmbedding" (
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

CREATE TABLE IF NOT EXISTS "AttentionItem" (
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

CREATE TABLE IF NOT EXISTS "AttentionSettings" (
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

CREATE TABLE IF NOT EXISTS "ApiKey" (
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

CREATE TABLE IF NOT EXISTS "ApiIdempotency" (
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

CREATE TABLE IF NOT EXISTS "WebhookSubscription" (
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

CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
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

CREATE TABLE IF NOT EXISTS "Extension" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "CollectionSettings_storeId_key" ON "CollectionSettings"("storeId");

CREATE INDEX IF NOT EXISTS "CollectionSettings_storeId_idx" ON "CollectionSettings"("storeId");

CREATE INDEX IF NOT EXISTS "CollectionTemplate_storeId_category_idx" ON "CollectionTemplate"("storeId", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "CollectionTemplate_storeId_category_name_key" ON "CollectionTemplate"("storeId", "category", "name");

CREATE INDEX IF NOT EXISTS "CollectionContactLog_storeId_createdAt_idx" ON "CollectionContactLog"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "CollectionContactLog_storeId_status_idx" ON "CollectionContactLog"("storeId", "status");

CREATE INDEX IF NOT EXISTS "CollectionContactLog_orderId_idx" ON "CollectionContactLog"("orderId");

CREATE INDEX IF NOT EXISTS "CollectionContactLog_customerId_idx" ON "CollectionContactLog"("customerId");

CREATE INDEX IF NOT EXISTS "Supplier_storeId_idx" ON "Supplier"("storeId");

CREATE INDEX IF NOT EXISTS "Supplier_storeId_isActive_idx" ON "Supplier"("storeId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_storeId_name_key" ON "Supplier"("storeId", "name");

CREATE INDEX IF NOT EXISTS "SupplierInvoice_storeId_idx" ON "SupplierInvoice"("storeId");

CREATE INDEX IF NOT EXISTS "SupplierInvoice_storeId_date_idx" ON "SupplierInvoice"("storeId", "date");

CREATE INDEX IF NOT EXISTS "SupplierInvoice_storeId_status_idx" ON "SupplierInvoice"("storeId", "status");

CREATE INDEX IF NOT EXISTS "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");

CREATE INDEX IF NOT EXISTS "SupplierPayment_storeId_idx" ON "SupplierPayment"("storeId");

CREATE INDEX IF NOT EXISTS "SupplierPayment_storeId_date_idx" ON "SupplierPayment"("storeId", "date");

CREATE INDEX IF NOT EXISTS "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

CREATE INDEX IF NOT EXISTS "SupplierPayment_invoiceId_idx" ON "SupplierPayment"("invoiceId");

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalProduct_productId_key" ON "DigitalProduct"("productId");

CREATE INDEX IF NOT EXISTS "DigitalProduct_productId_idx" ON "DigitalProduct"("productId");

CREATE UNIQUE INDEX IF NOT EXISTS "DigitalDelivery_token_key" ON "DigitalDelivery"("token");

CREATE INDEX IF NOT EXISTS "DigitalDelivery_token_idx" ON "DigitalDelivery"("token");

CREATE INDEX IF NOT EXISTS "DigitalDelivery_orderItemId_idx" ON "DigitalDelivery"("orderItemId");

CREATE INDEX IF NOT EXISTS "PotentialClient_estadoProspecto_idx" ON "PotentialClient"("estadoProspecto");

CREATE INDEX IF NOT EXISTS "PotentialClient_categoria_idx" ON "PotentialClient"("categoria");

CREATE INDEX IF NOT EXISTS "PotentialClient_ciudad_idx" ON "PotentialClient"("ciudad");

CREATE INDEX IF NOT EXISTS "PotentialClient_createdAt_idx" ON "PotentialClient"("createdAt");

CREATE INDEX IF NOT EXISTS "PotentialClientActivity_prospectId_fecha_idx" ON "PotentialClientActivity"("prospectId", "fecha");

CREATE INDEX IF NOT EXISTS "PotentialClientFile_prospectId_idx" ON "PotentialClientFile"("prospectId");

CREATE INDEX IF NOT EXISTS "PotentialClientReminder_prospectId_fecha_idx" ON "PotentialClientReminder"("prospectId", "fecha");

CREATE INDEX IF NOT EXISTS "PotentialClientReminder_completado_fecha_idx" ON "PotentialClientReminder"("completado", "fecha");

CREATE INDEX IF NOT EXISTS "SalesSection_orden_idx" ON "SalesSection"("orden");

CREATE INDEX IF NOT EXISTS "SalesSection_route_idx" ON "SalesSection"("route");

CREATE INDEX IF NOT EXISTS "SalesQuestion_sectionId_orden_idx" ON "SalesQuestion"("sectionId", "orden");

CREATE INDEX IF NOT EXISTS "SalesQuestion_categoria_idx" ON "SalesQuestion"("categoria");

CREATE INDEX IF NOT EXISTS "SalesSession_prospectId_idx" ON "SalesSession"("prospectId");

CREATE INDEX IF NOT EXISTS "SalesSession_estado_idx" ON "SalesSession"("estado");

CREATE INDEX IF NOT EXISTS "SalesSession_completadaAt_idx" ON "SalesSession"("completadaAt");

CREATE INDEX IF NOT EXISTS "SalesAnswer_sessionId_idx" ON "SalesAnswer"("sessionId");

CREATE UNIQUE INDEX IF NOT EXISTS "SalesAnswer_sessionId_questionId_key" ON "SalesAnswer"("sessionId", "questionId");

CREATE INDEX IF NOT EXISTS "SalesScoringRule_activo_idx" ON "SalesScoringRule"("activo");

CREATE INDEX IF NOT EXISTS "SalesPlanRecommendation_plan_idx" ON "SalesPlanRecommendation"("plan");

CREATE UNIQUE INDEX IF NOT EXISTS "ScannerSession_token_key" ON "ScannerSession"("token");

CREATE INDEX IF NOT EXISTS "ScannerSession_storeId_status_idx" ON "ScannerSession"("storeId", "status");

CREATE INDEX IF NOT EXISTS "ScannerSession_token_idx" ON "ScannerSession"("token");

CREATE INDEX IF NOT EXISTS "ScannerSession_expiresAt_idx" ON "ScannerSession"("expiresAt");

CREATE INDEX IF NOT EXISTS "ScannerEvent_sessionId_createdAt_idx" ON "ScannerEvent"("sessionId", "createdAt");

CREATE INDEX IF NOT EXISTS "Conversation_userId_storeId_updatedAt_idx" ON "Conversation"("userId", "storeId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Conversation_storeId_updatedAt_idx" ON "Conversation"("storeId", "updatedAt");

CREATE INDEX IF NOT EXISTS "Conversation_negocioId_idx" ON "Conversation"("negocioId");

CREATE INDEX IF NOT EXISTS "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

CREATE INDEX IF NOT EXISTS "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "InboxChannel_storeId_isActive_idx" ON "InboxChannel"("storeId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "InboxChannel_storeId_type_key" ON "InboxChannel"("storeId", "type");

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelConnection_channelId_key" ON "ChannelConnection"("channelId");

CREATE INDEX IF NOT EXISTS "ChannelConnection_storeId_status_idx" ON "ChannelConnection"("storeId", "status");

CREATE INDEX IF NOT EXISTS "ChannelConnection_externalRef_idx" ON "ChannelConnection"("externalRef");

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelConnection_storeId_channelId_key" ON "ChannelConnection"("storeId", "channelId");

CREATE INDEX IF NOT EXISTS "InboxConversation_storeId_status_updatedAt_idx" ON "InboxConversation"("storeId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "InboxConversation_storeId_updatedAt_idx" ON "InboxConversation"("storeId", "updatedAt");

CREATE INDEX IF NOT EXISTS "InboxConversation_storeId_externalRef_idx" ON "InboxConversation"("storeId", "externalRef");

CREATE INDEX IF NOT EXISTS "InboxConversation_customerId_idx" ON "InboxConversation"("customerId");

CREATE INDEX IF NOT EXISTS "InboxConversation_assignedToId_idx" ON "InboxConversation"("assignedToId");

CREATE INDEX IF NOT EXISTS "InboxConversation_channelId_idx" ON "InboxConversation"("channelId");

CREATE INDEX IF NOT EXISTS "InboxMessage_conversationId_createdAt_idx" ON "InboxMessage"("conversationId", "createdAt");

CREATE INDEX IF NOT EXISTS "InboxMessage_storeId_createdAt_idx" ON "InboxMessage"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "InboxMessage_storeId_sender_idx" ON "InboxMessage"("storeId", "sender");

CREATE UNIQUE INDEX IF NOT EXISTS "InboxMessage_storeId_externalId_key" ON "InboxMessage"("storeId", "externalId");

CREATE INDEX IF NOT EXISTS "InboxParticipant_conversationId_idx" ON "InboxParticipant"("conversationId");

CREATE INDEX IF NOT EXISTS "InboxParticipant_storeId_idx" ON "InboxParticipant"("storeId");

CREATE INDEX IF NOT EXISTS "InboxTag_storeId_idx" ON "InboxTag"("storeId");

CREATE UNIQUE INDEX IF NOT EXISTS "InboxTag_storeId_name_key" ON "InboxTag"("storeId", "name");

CREATE INDEX IF NOT EXISTS "InboxNote_conversationId_idx" ON "InboxNote"("conversationId");

CREATE INDEX IF NOT EXISTS "InboxNote_storeId_idx" ON "InboxNote"("storeId");

CREATE INDEX IF NOT EXISTS "InboxAiSummary_conversationId_kind_createdAt_idx" ON "InboxAiSummary"("conversationId", "kind", "createdAt");

CREATE INDEX IF NOT EXISTS "InboxAiSummary_storeId_idx" ON "InboxAiSummary"("storeId");

CREATE INDEX IF NOT EXISTS "BusinessMemory_storeId_scope_importance_idx" ON "BusinessMemory"("storeId", "scope", "importance");

CREATE INDEX IF NOT EXISTS "BusinessMemory_storeId_type_idx" ON "BusinessMemory"("storeId", "type");

CREATE INDEX IF NOT EXISTS "BusinessMemory_storeId_updatedAt_idx" ON "BusinessMemory"("storeId", "updatedAt");

CREATE INDEX IF NOT EXISTS "BusinessMemory_negocioId_idx" ON "BusinessMemory"("negocioId");

CREATE INDEX IF NOT EXISTS "BusinessMemory_expiresAt_idx" ON "BusinessMemory"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BusinessMemory_storeId_key_key" ON "BusinessMemory"("storeId", "key");

CREATE INDEX IF NOT EXISTS "Recommendation_storeId_status_createdAt_idx" ON "Recommendation"("storeId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Recommendation_storeId_ruleId_createdAt_idx" ON "Recommendation"("storeId", "ruleId", "createdAt");

CREATE INDEX IF NOT EXISTS "Recommendation_storeId_createdAt_idx" ON "Recommendation"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "KnowledgeDocument_storeId_updatedAt_idx" ON "KnowledgeDocument"("storeId", "updatedAt");

CREATE INDEX IF NOT EXISTS "KnowledgeDocument_storeId_status_idx" ON "KnowledgeDocument"("storeId", "status");

CREATE INDEX IF NOT EXISTS "KnowledgeDocument_storeId_type_idx" ON "KnowledgeDocument"("storeId", "type");

CREATE INDEX IF NOT EXISTS "KnowledgeDocument_storeId_createdAt_idx" ON "KnowledgeDocument"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "KnowledgeCategory_storeId_idx" ON "KnowledgeCategory"("storeId");

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeCategory_storeId_slug_key" ON "KnowledgeCategory"("storeId", "slug");

CREATE INDEX IF NOT EXISTS "KnowledgeTag_storeId_idx" ON "KnowledgeTag"("storeId");

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeTag_storeId_slug_key" ON "KnowledgeTag"("storeId", "slug");

CREATE INDEX IF NOT EXISTS "KnowledgeDocumentCategory_categoryId_idx" ON "KnowledgeDocumentCategory"("categoryId");

CREATE INDEX IF NOT EXISTS "KnowledgeDocumentTag_tagId_idx" ON "KnowledgeDocumentTag"("tagId");

CREATE INDEX IF NOT EXISTS "KnowledgeVersion_documentId_idx" ON "KnowledgeVersion"("documentId");

CREATE UNIQUE INDEX IF NOT EXISTS "KnowledgeVersion_documentId_version_key" ON "KnowledgeVersion"("documentId", "version");

CREATE INDEX IF NOT EXISTS "KnowledgeHistory_storeId_createdAt_idx" ON "KnowledgeHistory"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "KnowledgeHistory_documentId_idx" ON "KnowledgeHistory"("documentId");

CREATE INDEX IF NOT EXISTS "KnowledgeEmbedding_documentId_idx" ON "KnowledgeEmbedding"("documentId");

CREATE INDEX IF NOT EXISTS "AttentionItem_storeId_status_createdAt_idx" ON "AttentionItem"("storeId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "AttentionItem_storeId_status_priority_idx" ON "AttentionItem"("storeId", "status", "priority");

CREATE INDEX IF NOT EXISTS "AttentionItem_storeId_type_status_idx" ON "AttentionItem"("storeId", "type", "status");

CREATE INDEX IF NOT EXISTS "AttentionItem_storeId_dedupeKey_idx" ON "AttentionItem"("storeId", "dedupeKey");

CREATE INDEX IF NOT EXISTS "AttentionItem_dedupeKey_idx" ON "AttentionItem"("dedupeKey");

CREATE INDEX IF NOT EXISTS "AttentionItem_entityType_entityId_idx" ON "AttentionItem"("entityType", "entityId");

CREATE UNIQUE INDEX IF NOT EXISTS "AttentionSettings_storeId_key" ON "AttentionSettings"("storeId");

CREATE INDEX IF NOT EXISTS "AttentionSettings_storeId_idx" ON "AttentionSettings"("storeId");

CREATE INDEX IF NOT EXISTS "ApiKey_storeId_idx" ON "ApiKey"("storeId");

CREATE INDEX IF NOT EXISTS "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

CREATE INDEX IF NOT EXISTS "ApiKey_storeId_status_idx" ON "ApiKey"("storeId", "status");

CREATE INDEX IF NOT EXISTS "ApiIdempotency_storeId_key_idx" ON "ApiIdempotency"("storeId", "key");

CREATE INDEX IF NOT EXISTS "ApiIdempotency_createdAt_idx" ON "ApiIdempotency"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ApiIdempotency_storeId_key_key" ON "ApiIdempotency"("storeId", "key");

CREATE INDEX IF NOT EXISTS "WebhookSubscription_storeId_idx" ON "WebhookSubscription"("storeId");

CREATE INDEX IF NOT EXISTS "WebhookSubscription_storeId_status_idx" ON "WebhookSubscription"("storeId", "status");

CREATE INDEX IF NOT EXISTS "WebhookDelivery_storeId_createdAt_idx" ON "WebhookDelivery"("storeId", "createdAt");

CREATE INDEX IF NOT EXISTS "WebhookDelivery_storeId_status_idx" ON "WebhookDelivery"("storeId", "status");

CREATE INDEX IF NOT EXISTS "WebhookDelivery_subscriptionId_createdAt_idx" ON "WebhookDelivery"("subscriptionId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookDelivery_subscriptionId_eventId_key" ON "WebhookDelivery"("subscriptionId", "eventId");

CREATE INDEX IF NOT EXISTS "Extension_storeId_idx" ON "Extension"("storeId");

CREATE INDEX IF NOT EXISTS "Extension_storeId_status_idx" ON "Extension"("storeId", "status");

CREATE INDEX IF NOT EXISTS "Collection_storeId_idx" ON "Collection"("storeId");

CREATE INDEX IF NOT EXISTS "Expense_storeId_idx" ON "Expense"("storeId");

CREATE INDEX IF NOT EXISTS "Expense_storeId_date_idx" ON "Expense"("storeId", "date");

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");

CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");

CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_idx" ON "OrderPayment"("orderId");

CREATE INDEX IF NOT EXISTS "OrderPayment_paymentAccountId_idx" ON "OrderPayment"("paymentAccountId");

CREATE INDEX IF NOT EXISTS "Product_storeId_idx" ON "Product"("storeId");

CREATE INDEX IF NOT EXISTS "Product_storeId_isActive_idx" ON "Product"("storeId", "isActive");

CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON "Product"("sku");

CREATE INDEX IF NOT EXISTS "Product_barcode_idx" ON "Product"("barcode");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionSettings_storeId_fkey') THEN
    ALTER TABLE "CollectionSettings" ADD CONSTRAINT "CollectionSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionTemplate_storeId_fkey') THEN
    ALTER TABLE "CollectionTemplate" ADD CONSTRAINT "CollectionTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionContactLog_storeId_fkey') THEN
    ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionContactLog_orderId_fkey') THEN
    ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CollectionContactLog_customerId_fkey') THEN
    ALTER TABLE "CollectionContactLog" ADD CONSTRAINT "CollectionContactLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Supplier_storeId_fkey') THEN
    ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierInvoice_storeId_fkey') THEN
    ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierInvoice_supplierId_fkey') THEN
    ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierPayment_storeId_fkey') THEN
    ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierPayment_supplierId_fkey') THEN
    ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SupplierPayment_invoiceId_fkey') THEN
    ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DigitalProduct_productId_fkey') THEN
    ALTER TABLE "DigitalProduct" ADD CONSTRAINT "DigitalProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DigitalDelivery_orderItemId_fkey') THEN
    ALTER TABLE "DigitalDelivery" ADD CONSTRAINT "DigitalDelivery_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PotentialClientActivity_prospectId_fkey') THEN
    ALTER TABLE "PotentialClientActivity" ADD CONSTRAINT "PotentialClientActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PotentialClientFile_prospectId_fkey') THEN
    ALTER TABLE "PotentialClientFile" ADD CONSTRAINT "PotentialClientFile_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PotentialClientReminder_prospectId_fkey') THEN
    ALTER TABLE "PotentialClientReminder" ADD CONSTRAINT "PotentialClientReminder_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesQuestion_sectionId_fkey') THEN
    ALTER TABLE "SalesQuestion" ADD CONSTRAINT "SalesQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SalesSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesSession_prospectId_fkey') THEN
    ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "PotentialClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesSession_sectionId_fkey') THEN
    ALTER TABLE "SalesSession" ADD CONSTRAINT "SalesSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SalesSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesAnswer_sessionId_fkey') THEN
    ALTER TABLE "SalesAnswer" ADD CONSTRAINT "SalesAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalesSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalesAnswer_questionId_fkey') THEN
    ALTER TABLE "SalesAnswer" ADD CONSTRAINT "SalesAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SalesQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScannerSession_storeId_fkey') THEN
    ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScannerSession_negocioId_fkey') THEN
    ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScannerSession_userId_fkey') THEN
    ALTER TABLE "ScannerSession" ADD CONSTRAINT "ScannerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScannerEvent_sessionId_fkey') THEN
    ALTER TABLE "ScannerEvent" ADD CONSTRAINT "ScannerEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ScannerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_userId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_storeId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_negocioId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ConversationMessage_conversationId_fkey') THEN
    ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxChannel_storeId_fkey') THEN
    ALTER TABLE "InboxChannel" ADD CONSTRAINT "InboxChannel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChannelConnection_channelId_fkey') THEN
    ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "InboxChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChannelConnection_storeId_fkey') THEN
    ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversation_channelId_fkey') THEN
    ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "InboxChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversation_customerId_fkey') THEN
    ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversation_assignedToId_fkey') THEN
    ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversation_storeId_fkey') THEN
    ALTER TABLE "InboxConversation" ADD CONSTRAINT "InboxConversation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxMessage_conversationId_fkey') THEN
    ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxMessage_storeId_fkey') THEN
    ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxParticipant_conversationId_fkey') THEN
    ALTER TABLE "InboxParticipant" ADD CONSTRAINT "InboxParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxParticipant_storeId_fkey') THEN
    ALTER TABLE "InboxParticipant" ADD CONSTRAINT "InboxParticipant_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxTag_storeId_fkey') THEN
    ALTER TABLE "InboxTag" ADD CONSTRAINT "InboxTag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversationTag_conversationId_fkey') THEN
    ALTER TABLE "InboxConversationTag" ADD CONSTRAINT "InboxConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxConversationTag_tagId_fkey') THEN
    ALTER TABLE "InboxConversationTag" ADD CONSTRAINT "InboxConversationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "InboxTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxNote_conversationId_fkey') THEN
    ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxNote_storeId_fkey') THEN
    ALTER TABLE "InboxNote" ADD CONSTRAINT "InboxNote_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxAiSummary_conversationId_fkey') THEN
    ALTER TABLE "InboxAiSummary" ADD CONSTRAINT "InboxAiSummary_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "InboxConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxAiSummary_storeId_fkey') THEN
    ALTER TABLE "InboxAiSummary" ADD CONSTRAINT "InboxAiSummary_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessMemory_storeId_fkey') THEN
    ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessMemory_userId_fkey') THEN
    ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessMemory_negocioId_fkey') THEN
    ALTER TABLE "BusinessMemory" ADD CONSTRAINT "BusinessMemory_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_storeId_fkey') THEN
    ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocument_storeId_fkey') THEN
    ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocument_authorId_fkey') THEN
    ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeCategory_storeId_fkey') THEN
    ALTER TABLE "KnowledgeCategory" ADD CONSTRAINT "KnowledgeCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeTag_storeId_fkey') THEN
    ALTER TABLE "KnowledgeTag" ADD CONSTRAINT "KnowledgeTag_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocumentCategory_documentId_fkey') THEN
    ALTER TABLE "KnowledgeDocumentCategory" ADD CONSTRAINT "KnowledgeDocumentCategory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocumentCategory_categoryId_fkey') THEN
    ALTER TABLE "KnowledgeDocumentCategory" ADD CONSTRAINT "KnowledgeDocumentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "KnowledgeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocumentTag_documentId_fkey') THEN
    ALTER TABLE "KnowledgeDocumentTag" ADD CONSTRAINT "KnowledgeDocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeDocumentTag_tagId_fkey') THEN
    ALTER TABLE "KnowledgeDocumentTag" ADD CONSTRAINT "KnowledgeDocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "KnowledgeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeVersion_documentId_fkey') THEN
    ALTER TABLE "KnowledgeVersion" ADD CONSTRAINT "KnowledgeVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeHistory_storeId_fkey') THEN
    ALTER TABLE "KnowledgeHistory" ADD CONSTRAINT "KnowledgeHistory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeHistory_documentId_fkey') THEN
    ALTER TABLE "KnowledgeHistory" ADD CONSTRAINT "KnowledgeHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeEmbedding_documentId_fkey') THEN
    ALTER TABLE "KnowledgeEmbedding" ADD CONSTRAINT "KnowledgeEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttentionItem_storeId_fkey') THEN
    ALTER TABLE "AttentionItem" ADD CONSTRAINT "AttentionItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AttentionSettings_storeId_fkey') THEN
    ALTER TABLE "AttentionSettings" ADD CONSTRAINT "AttentionSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_storeId_fkey') THEN
    ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiIdempotency_storeId_fkey') THEN
    ALTER TABLE "ApiIdempotency" ADD CONSTRAINT "ApiIdempotency_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookSubscription_storeId_fkey') THEN
    ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_storeId_fkey') THEN
    ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_subscriptionId_fkey') THEN
    ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Extension_storeId_fkey') THEN
    ALTER TABLE "Extension" ADD CONSTRAINT "Extension_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
