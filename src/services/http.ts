import { NextResponse } from "next/server"
import { isServiceError } from "@/services/errors"

export function toServiceResponse(error: unknown): NextResponse {
  if (isServiceError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Error desconocido"
  console.error("[service error]", message, error instanceof Error ? error.stack : "")
  return NextResponse.json({ error: message }, { status: 500 })
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function jsonSuccess<T>(data: T): NextResponse {
  return NextResponse.json(data)
}
