-- ============================================================
-- RLS Policies para Panitas (referencia para migración a Supabase)
-- ============================================================
-- Estas políticas replican la validación de negocio.planId + modalidad
-- a nivel de base de datos (Row Level Security).
-- ============================================================

-- Habilitar RLS en tablas
ALTER TABLE "Negocio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Obtener el negocio del usuario autenticado
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_negocio()
RETURNS TABLE (
  id UUID,
  plan_id TEXT,
  modalidad TEXT,
  plan_estado TEXT,
  plan_vencimiento TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT id, plan_id, modalidad, plan_estado, plan_vencimiento
  FROM "Negocio"
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- Helper: Verificar si el usuario tiene acceso a un módulo
-- ============================================================
CREATE OR REPLACE FUNCTION auth.puede_acceder_modulo(modulo TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT
    CASE
      WHEN n.plan_estado = 'suspendido' OR n.plan_estado = 'cancelado' THEN false
      WHEN n.plan_vencimiento IS NOT NULL AND n.plan_vencimiento < NOW() THEN false
      WHEN n.plan_id = 'negocio' THEN true
      WHEN n.plan_id = 'basico' THEN n.modalidad = modulo
      ELSE false
    END
  FROM auth.user_negocio() n
  WHERE n.id IS NOT NULL;
$$;

-- ============================================================
-- Políticas para Store (require: acceso a módulo "tienda")
-- ============================================================
CREATE POLICY "Usuarios pueden ver su propia tienda"
  ON "Store"
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND auth.puede_acceder_modulo('tienda')
  );

CREATE POLICY "Usuarios pueden crear su tienda"
  ON "Store"
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND auth.puede_acceder_modulo('tienda')
  );

CREATE POLICY "Propietario puede modificar su tienda"
  ON "Store"
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Propietario puede eliminar su tienda"
  ON "Store"
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- Políticas para Product (scope por store.negocioId)
-- ============================================================
CREATE POLICY "Usuarios pueden ver productos de su negocio"
  ON "Product"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Store" s
      JOIN auth.user_negocio() n ON n.id = s.negocio_id
      WHERE s.id = store_id
      AND auth.puede_acceder_modulo('tienda')
    )
  );

CREATE POLICY "Usuarios pueden crear productos en su tienda"
  ON "Product"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Store" s
      JOIN auth.user_negocio() n ON n.id = s.negocio_id
      WHERE s.id = store_id
      AND auth.puede_acceder_modulo('tienda')
    )
  );

-- ============================================================
-- Políticas para Agenda (scope por negocioId)
-- ============================================================
CREATE POLICY "Usuarios pueden ver su agenda"
  ON "Agenda"
  FOR SELECT
  USING (
    negocio_id IN (SELECT id FROM auth.user_negocio())
    AND auth.puede_acceder_modulo('agenda')
  );

CREATE POLICY "Usuarios pueden crear agenda"
  ON "Agenda"
  FOR INSERT
  WITH CHECK (
    negocio_id IN (SELECT id FROM auth.user_negocio())
    AND auth.puede_acceder_modulo('agenda')
  );

-- ============================================================
-- Políticas para Service (scope por agenda.negocioId)
-- ============================================================
CREATE POLICY "Usuarios pueden ver servicios de su agenda"
  ON "Service"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Agenda" a
      JOIN auth.user_negocio() n ON n.id = a.negocio_id
      WHERE a.id = agenda_id
      AND auth.puede_acceder_modulo('agenda')
    )
  );

-- ============================================================
-- Políticas para Appointment (scope por agenda.negocioId)
-- ============================================================
CREATE POLICY "Usuarios pueden ver citas de su agenda"
  ON "Appointment"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Agenda" a
      JOIN auth.user_negocio() n ON n.id = a.negocio_id
      WHERE a.id = agenda_id
      AND auth.puede_acceder_modulo('agenda')
    )
  );
