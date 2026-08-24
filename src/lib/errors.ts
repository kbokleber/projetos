export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "TASK_NOT_FOUND"
  | "PROJECT_NOT_FOUND";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false as const,
      error: {
        code: error.code,
        message: error.message,
      },
      status: error.status,
    };
  }

  console.error(error);

  return {
    success: false as const,
    error: {
      code: "INTERNAL_ERROR" as const,
      message: "Ocorreu um erro interno.",
    },
    status: 500,
  };
}
