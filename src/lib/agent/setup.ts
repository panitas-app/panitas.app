import { availableTools } from "@/lib/agent/tools"
import { registerTool } from "@/lib/agent/registry"

export function setupAgentTools(): void {
  for (const tool of availableTools) {
    registerTool(tool)
  }
}
