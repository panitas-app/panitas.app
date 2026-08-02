import type { AgentTool } from "@/lib/agent/types"
import { inventoryTools } from "@/lib/agent/tools/inventory.tools"
import { productTools } from "@/lib/agent/tools/product.tools"
import { salesTools } from "@/lib/agent/tools/sales.tools"
import { customerTools } from "@/lib/agent/tools/customer.tools"
import { agendaTools } from "@/lib/agent/tools/agenda.tools"
import { orderTools } from "@/lib/agent/tools/order.tools"
import { reportTools } from "@/lib/agent/tools/report.tools"

export const availableTools: AgentTool[] = [
  ...inventoryTools,
  ...productTools,
  ...salesTools,
  ...customerTools,
  ...agendaTools,
  ...orderTools,
  ...reportTools,
]

export { inventoryTools } from "@/lib/agent/tools/inventory.tools"
export { productTools } from "@/lib/agent/tools/product.tools"
export { salesTools } from "@/lib/agent/tools/sales.tools"
export { customerTools } from "@/lib/agent/tools/customer.tools"
export { agendaTools } from "@/lib/agent/tools/agenda.tools"
export { orderTools } from "@/lib/agent/tools/order.tools"
export { reportTools } from "@/lib/agent/tools/report.tools"
