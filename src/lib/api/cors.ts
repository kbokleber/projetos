/**
 * CORS para a API pública.
 * Lê `API_ALLOWED_ORIGINS` (csv) do .env. Em produção, nunca `*`.
 */

const DEFAULT_ORIGINS = ["http://localhost:3000"];

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.API_ALLOWED_ORIGINS;
  if (!fromEnv || fromEnv.trim() === "") return DEFAULT_ORIGINS;
  return fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  if (allowed.includes("*")) return true;
  return allowed.includes(origin);
}

export function corsHeaders(origin: string | null): Headers {
  const h = new Headers();
  if (origin && isOriginAllowed(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
  }
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  h.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Idempotency-Key, X-Requested-With",
  );
  h.set("Access-Control-Max-Age", "86400");
  return h;
}
