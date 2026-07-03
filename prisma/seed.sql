-- Seed plans
INSERT INTO "Plan" (id, nombre, label, descripcion, "precioUsd", "precioUsdAnual", activo, "sortOrder", "createdAt", "updatedAt")
VALUES
  ('basico', 'basico', 'Básico', 'Elige una modalidad: Tienda o Agenda.', 15, 150, true, 1, NOW(), NOW()),
  ('negocio', 'negocio', 'Negocio', 'Tienda y Agenda en una misma cuenta.', 25, 250, true, 2, NOW(), NOW()),
  ('empresarial', 'empresarial', 'Empresarial', 'Sistema B2B para mayoristas.', 0, 0, false, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  label = EXCLUDED.label,
  descripcion = EXCLUDED.descripcion,
  "precioUsd" = EXCLUDED."precioUsd",
  "precioUsdAnual" = EXCLUDED."precioUsdAnual",
  activo = EXCLUDED.activo,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Seed plan features
INSERT INTO "PlanFeature" (id, "planId", key, label, tipo)
VALUES
  (gen_random_uuid()::text, 'basico', 'productos_ilimitados', 'Productos ilimitados', 'boolean'),
  (gen_random_uuid()::text, 'basico', 'crm', 'CRM', 'boolean'),
  (gen_random_uuid()::text, 'basico', 'automations', 'Automatizaciones', 'boolean'),
  (gen_random_uuid()::text, 'basico', 'dominio_propio', 'Dominio propio', 'boolean'),
  (gen_random_uuid()::text, 'negocio', 'crm', 'CRM', 'boolean'),
  (gen_random_uuid()::text, 'negocio', 'automations', 'Automatizaciones', 'boolean')
ON CONFLICT ("planId", key) DO UPDATE SET label = EXCLUDED.label, tipo = EXCLUDED.tipo;
