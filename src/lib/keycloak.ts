import type { GlobalRole } from "@/types";

/** True quando as três envs do client OIDC estão definidas. */
export function isKeycloakConfigured(): boolean {
  return Boolean(
    process.env.AUTH_KEYCLOAK_ID &&
      process.env.AUTH_KEYCLOAK_SECRET &&
      process.env.AUTH_KEYCLOAK_ISSUER,
  );
}

export function isLegacyLoginEnabled(): boolean {
  return process.env.LEGACY_LOGIN_ENABLED === "true";
}

export function isKeycloakSignupAllowed(): boolean {
  return process.env.KEYCLOAK_ALLOW_SIGNUP === "true";
}

export function getAuthUrl(): string {
  return (
    process.env.AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getKeycloakIssuer(): string | undefined {
  return process.env.AUTH_KEYCLOAK_ISSUER?.replace(/\/$/, "");
}

export function getKeycloakAccountUrl(): string | undefined {
  const issuer = getKeycloakIssuer();
  return issuer ? `${issuer}/account` : undefined;
}

type JwtPayload = {
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  email_verified?: boolean;
  email?: string;
  name?: string;
  preferred_username?: string;
  sub?: string;
};

/** Decodifica o payload de um JWT sem verificar assinatura (só leitura de claims). */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1]!, "base64url").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extrai papel global a partir de realm roles e client roles do client `projetos`.
 * `admin` → ADMIN; `user` → USER; nenhum → null (negar login).
 */
export function extractGlobalRoleFromTokens(opts: {
  accessToken?: string | null;
  idToken?: string | null;
  profile?: Record<string, unknown> | null;
}): GlobalRole | null {
  const roles = new Set<string>();

  const collect = (payload: JwtPayload | null | undefined) => {
    if (!payload) return;
    for (const r of payload.realm_access?.roles ?? []) {
      roles.add(r.toLowerCase());
    }
    const clientId = process.env.AUTH_KEYCLOAK_ID ?? "projetos";
    for (const r of payload.resource_access?.[clientId]?.roles ?? []) {
      roles.add(r.toLowerCase());
    }
  };

  if (opts.accessToken) collect(decodeJwtPayload(opts.accessToken));
  if (opts.idToken) collect(decodeJwtPayload(opts.idToken));

  const profile = opts.profile;
  if (profile) {
    const realm = profile.realm_access as { roles?: string[] } | undefined;
    for (const r of realm?.roles ?? []) roles.add(String(r).toLowerCase());
    const resource = profile.resource_access as
      | Record<string, { roles?: string[] }>
      | undefined;
    const clientId = process.env.AUTH_KEYCLOAK_ID ?? "projetos";
    for (const r of resource?.[clientId]?.roles ?? []) {
      roles.add(String(r).toLowerCase());
    }
  }

  if (roles.has("admin")) return "ADMIN";
  if (roles.has("user")) return "USER";
  return null;
}

export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  NoLocalUser:
    "Seu usuário do Keycloak não está cadastrado no sistema de projetos. Peça acesso a um administrador.",
  AccessDenied: "Acesso negado. Você não tem permissão para entrar.",
  EmailNotVerified:
    "Seu e-mail no Keycloak ainda não foi verificado. Confirme o e-mail e tente novamente.",
  NoRole:
    "Sem permissão para o sistema de projetos. Peça a um administrador para atribuir a role admin ou user no Keycloak.",
  AccountConflict:
    "Este e-mail já está vinculado a outra conta Keycloak. Contate o administrador.",
  Configuration:
    "Configuração de autenticação incompleta. Contate o administrador.",
  OAuthAccountNotLinked:
    "Não foi possível vincular a conta. Contate o administrador.",
  Default: "Não foi possível entrar. Tente novamente.",
};

export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return LOGIN_ERROR_MESSAGES[code] ?? LOGIN_ERROR_MESSAGES.Default ?? null;
}
