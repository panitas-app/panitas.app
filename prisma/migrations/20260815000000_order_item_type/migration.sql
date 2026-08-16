-- Conceptos adicionales en ventas (POS): líneas que no son producto ni afectan inventario.
-- Idempotente: agrega la columna solo si no existe; nunca dropea.

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'PRODUCT';
