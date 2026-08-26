import {
  authenticateRequest,
  hasScope,
  type ApiScope,
  type AuthContext,
} from "@/lib/api/auth";
import { apiError, apiOk, readJson, type ApiResponse } from "@/lib/api/response";
import {
  applyRateLimitHeaders,
  DEFAULT_RATE_LIMIT,
  rateLimit,
} from "@/lib/api/rate-limit";
import { corsHeaders } from "@/lib/api/cors";
import { NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";

type HandlerCtx<P = Record<string, string>> = {
  req: Request;
  auth: AuthContext;
  body: unknown;
  params: P;
};

type RouteOptions<P, S extends ZodTypeAny | undefined> = {
  requireScope: ApiScope;
  schema?: S;
  paramsSchema?: z.ZodType<P>;
  /** Quando true, exige header `Idempotency-Key` em POST/PATCH/DELETE. */
  requireIdempotencyKey?: boolean;
};

export function withApi<P = Record<string, string>, S extends ZodTypeAny | undefined = undefined>(
  opts: RouteOptions<P, S>,
  handler: (ctx: HandlerCtx<P>) => Promise<Response> | Response,
) {
  return async (
    req: Request,
    context: { params: Promise<P> },
  ): Promise<Response> => {
    const origin = req.headers.get("origin");

    // CORS preflight
    if (req.method === "OPTIONS") {
      const res = new NextResponse(null, { status: 204 });
      const headers = corsHeaders(origin);
      headers.forEach((v, k) => res.headers.set(k, v));
      return res;
    }

    // 1) Auth
    const auth = await authenticateRequest(req);
    if (!auth) {
      const res = apiError("UNAUTHORIZED", "Token ausente ou inválido.", 401);
      return withCorsAndRateLimit(req, res, "anonymous", origin);
    }

    // 2) Scope
    if (!hasScope(auth, opts.requireScope)) {
      const res = apiError(
        "FORBIDDEN",
        `Escopo insuficiente. Necessário: ${opts.requireScope}`,
        403,
      );
      return withCorsAndRateLimit(req, res, auth.token.id, origin);
    }

    // 3) Rate limit
    const rl = rateLimit(auth.token.id, DEFAULT_RATE_LIMIT);
    if (!rl.allowed) {
      const res = apiError(
        "RATE_LIMITED",
        `Limite excedido. Tente novamente em ${rl.retryAfter}s.`,
        429,
      );
      return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
    }

    // 4) Params
    let params: P = {} as P;
    try {
      const resolved = await context.params;
      if (opts.paramsSchema) {
        const parsed = opts.paramsSchema.safeParse(resolved);
        if (!parsed.success) {
          const res = apiError(
            "VALIDATION_ERROR",
            `Parâmetros inválidos: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`,
            400,
          );
          return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
        }
        params = parsed.data;
      } else {
        params = resolved as P;
      }
    } catch {
      params = {} as P;
    }

    // 5) Body
    let body: unknown = undefined;
    if (req.method !== "GET" && req.method !== "DELETE") {
      body = await readJson(req);
    }

    // 6) Schema validation
    if (opts.schema && body !== undefined) {
      const schema = opts.schema as ZodTypeAny;
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        const res = apiError(
          "VALIDATION_ERROR",
          `Corpo inválido: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`,
          422,
        );
        return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
      }
      body = parsed.data;
    }

    // 7) Idempotency-Key (apenas para POST/PATCH/DELETE)
    if (
      opts.requireIdempotencyKey &&
      req.method !== "GET" &&
      req.method !== "OPTIONS"
    ) {
      const key = req.headers.get("idempotency-key");
      if (!key) {
        const res = apiError(
          "VALIDATION_ERROR",
          "Header `Idempotency-Key` é obrigatório.",
          400,
        );
        return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
      }
    }

    // 8) Execução do handler
    try {
      const out = await handler({ req, auth, body, params });
      return withCorsAndRateLimit(req, out, auth.token.id, origin, rl);
    } catch (err) {
      if (err instanceof AppError) {
        const res = apiError(err.code, err.message, err.status);
        return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
      }
      console.error("[api]", err);
      const res = apiError("INTERNAL_ERROR", "Erro interno do servidor.", 500);
      return withCorsAndRateLimit(req, res, auth.token.id, origin, rl);
    }
  };
}

function withCorsAndRateLimit(
  req: Request,
  res: Response,
  _rateKey: string,
  origin: string | null,
  rl?: { remaining: number; reset: number; retryAfter: number },
): Response {
  const headers = corsHeaders(origin);
  headers.forEach((v, k) => {
    if (!res.headers.has(k)) res.headers.set(k, v);
  });
  if (rl) {
    applyRateLimitHeaders(res, { ...rl, allowed: true }, DEFAULT_RATE_LIMIT.limit);
  }
  return res;
}

/** Atalho para responder erro padronizado. */
export function notFound(message = "Recurso não encontrado.") {
  return apiError("NOT_FOUND", message, 404);
}

/** Lê idempotência salva ou executa fn gravando o resultado. */
export async function withIdempotency<T>(
  workspaceId: string,
  key: string,
  requestHash: string,
  fn: () => Promise<{ code: number; body: ApiResponse<T> }>,
): Promise<{ code: number; body: ApiResponse<T> }> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
  });
  if (existing) {
    return {
      code: existing.responseCode,
      body: JSON.parse(existing.responseBody) as ApiResponse<T>,
    };
  }

  const result = await fn();

  // Não persiste erros 5xx para permitir retry real
  if (result.code >= 500) return result;

  await prisma.idempotencyKey
    .create({
      data: {
        key,
        workspaceId,
        requestHash,
        responseCode: result.code,
        responseBody: JSON.stringify(result.body),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    .catch(() => {
      /* corrida benigna */
    });

  return result;
}

/** Hash de idempotência: workspace + path + body. */
export function idempotencyHash(workspaceId: string, path: string, body: unknown) {
  const json = typeof body === "string" ? body : JSON.stringify(body ?? {});
  return createHash("sha256")
    .update(`${workspaceId}|${path}|${json}`)
    .digest("hex");
}

// `apiOk` re-exportado para uso em handlers
export { apiOk };
