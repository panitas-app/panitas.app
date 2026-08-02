/**
 * Validación de input del Tool System (FASE 3B).
 *
 * Las tools declaran un `inputSchema`; el executor valida el input antes de
 * ejecutar. Devuelve los errores encontrados (vacío = input válido).
 */
import type { AgentTool } from "./types"

export type InputError = {
  field: string
  message: string
}

export function validateToolInput(tool: AgentTool, input: Record<string, unknown>): InputError[] {
  const errors: InputError[] = []
  const properties = tool.inputSchema.properties

  for (const [name, param] of Object.entries(properties)) {
    const value = input[name]
    const missing = value === undefined || value === null

    if (param.required && missing) {
      errors.push({ field: name, message: `El campo "${name}" es requerido` })
      continue
    }
    if (missing) continue

    switch (param.type) {
      case "string":
        if (typeof value !== "string") errors.push({ field: name, message: `"${name}" debe ser texto` })
        break
      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) {
          errors.push({ field: name, message: `"${name}" debe ser un número` })
        }
        break
      case "boolean":
        if (typeof value !== "boolean") errors.push({ field: name, message: `"${name}" debe ser booleano` })
        break
      case "array":
        if (!Array.isArray(value)) errors.push({ field: name, message: `"${name}" debe ser un arreglo` })
        break
      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push({ field: name, message: `"${name}" debe ser un objeto` })
        }
        break
    }
  }

  return errors
}
