export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "ServiceError"
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

export function serviceError(message: string, status = 400, code?: string, details?: unknown): ServiceError {
  return new ServiceError(message, status, code, details)
}
