import { CustomerService } from "@/services/customer.service"
import type { AgentTool } from "@/lib/agent/types"

const customerService = new CustomerService()

export const customerTools: AgentTool[] = [
  {
    name: "customers.list",
    description: "Lista clientes de la tienda con búsqueda opcional",
    permissions: ["customer.read"],
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Término de búsqueda: nombre, teléfono o email" },
      },
    },
    async execute(ctx, input) {
      const q = typeof input.q === "string" ? input.q : ""
      const { customers, total } = await customerService.list(
        { userId: ctx.userId, storeId: ctx.storeId },
        { q, skip: 0, take: 20 }
      )
      return {
        ok: true,
        data: {
          total,
          customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })),
        },
      }
    },
  },
  {
    name: "customers.create",
    description: "Registra o encuentra un cliente por teléfono (crea uno nuevo si no existe)",
    permissions: ["customer.create"],
    input_schema: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Teléfono del cliente (obligatorio)" },
        name: { type: "string", description: "Nombre del cliente" },
        email: { type: "string", description: "Email del cliente" },
      },
      required: ["phone"],
    },
    async execute(ctx, input) {
      const phone = typeof input.phone === "string" ? input.phone.trim() : ""
      if (!phone) return { ok: false, error: "Se requiere phone" }
      const { customer, created } = await customerService.findOrCreateByPhone(
        { userId: ctx.userId, storeId: ctx.storeId },
        {
          phone,
          name: typeof input.name === "string" ? input.name : null,
          email: typeof input.email === "string" ? input.email : null,
        }
      )
      return { ok: true, data: { id: customer.id, name: customer.name, created } }
    },
  },
]
