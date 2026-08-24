/**
 * Helpers para o contrato padrão da API pública.
 * Toda resposta de /api/v1/* deve passar por aqui.
 */

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ApiErrorCode | string; message: string } };

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, init);
}

export function apiError(
  code: ApiErrorCode | string,
  message: string,
  status: number,
) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: { code, message } },
    { status },
  );
}

/** Wrapper de try/catch para handlers — sempre responde no contrato. */
export async function handle<T>(
  fn: () => Promise<NextResponse<ApiResponse<T>>>,
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    return await fn();
  } catch (err) {
    console.error("[api]", err);
    return apiError("INTERNAL_ERROR", "Erro interno do servidor.", 500);
  }
}

/** Lê o body JSON com fallback silencioso (retorna {} se vazio). */
export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
