import { NextResponse } from "next/server"
import { isServiceError } from "@/services/errors"

export function toServiceResponse(error: unknown): NextResponse {
  if (isServiceError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error("[service error]", error)
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function jsonSuccess<T>(data: T): NextResponse {
  return NextResponse.json(data)
}
