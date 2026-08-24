/**
 * Sistema de autenticação da API pública via Bearer Token.
 *
 * Fluxo:
 *   1. Header `Authorization: Bearer pk_live_xxxxxxxx`
 *   2. Extrai prefixo (pk_live_ + 4 primeiros caracteres)
 *   3. Localiza ApiToken por prefix (rápido, evita scan)
 *   4. Compara hash SHA-256(token) === tokenHash
 *   5. Atualiza lastUsedAt
 *
 * O token bruto é mostrado uma única vez na criação.
 */

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ApiToken } from "@/generated/prisma/client";

const TOKEN_PREFIX = "pk_live_";
const TOKEN_BYTES = 24; // 48 chars hex

export type ApiScope =
  | "projects:read"
  | "projects:write"
  | "tasks:read"
  | "tasks:write"
  | "comments:read"
  | "comments:write"
  | "members:read"
  | "webhooks:read"
  | "webhooks:write";

export type AuthContext = {
  token: ApiToken;
  scopes: ApiScope[];
  workspaceId: string;
  userId: string | null;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): { token: string; prefix: string; tokenHash: string } {
  const body = randomBytes(TOKEN_BYTES).toString("hex");
  const token = `${TOKEN_PREFIX}${body}`;
  // prefix: primeiros 4 chars do payload (após TOKEN_PREFIX) → TOKEN_PREFIX.length + 4
  const prefix = token.slice(0, TOKEN_PREFIX.length + 4);
  const tokenHash = hashToken(token);
  return { token, prefix, tokenHash };
}

export function parseAuthHeader(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (scheme !== "Bearer" || !value) return null;
  return value.trim();
}

export async function authenticateRequest(
  req: Request,
): Promise<AuthContext | null> {
  const raw = parseAuthHeader(req);
  if (!raw || !raw.startsWith(TOKEN_PREFIX)) return null;

  // Para encontrar o registro, usamos os 4 primeiros caracteres após o prefixo
  // como prefixo. Isso evita scan completo da tabela.
  const prefix = raw.slice(0, TOKEN_PREFIX.length + 4);
  const tokenHash = hashToken(raw);

  const record = await prisma.apiToken.findFirst({
    where: {
      prefix,
      revokedAt: null,
    },
  });

  if (process.env.NODE_ENV !== "production" && process.env.DEBUG_API_AUTH) {
    console.log("[auth]", {
      receivedPrefix: prefix,
      receivedHash: tokenHash.slice(0, 12),
      found: record ? "yes" : "no",
      matched: record?.tokenHash === tokenHash,
    });
  }

  if (!record) return null;
  if (record.tokenHash !== tokenHash) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  let scopes: ApiScope[] = [];
  try {
    const parsed = JSON.parse(record.scopes);
    if (Array.isArray(parsed)) scopes = parsed as ApiScope[];
  } catch {
    scopes = [];
  }

  return {
    token: record,
    scopes,
    workspaceId: record.workspaceId,
    userId: record.userId,
  };
}

export function hasScope(ctx: AuthContext, required: ApiScope): boolean {
  return ctx.scopes.includes(required);
}

export function requireScope(ctx: AuthContext, required: ApiScope): boolean {
  return hasScope(ctx, required);
}
