import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getAuthUrl,
  getKeycloakIssuer,
  isKeycloakConfigured,
} from "@/lib/keycloak";

const AUTH_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

/**
 * Encerra a sessão local e redireciona para o end-session do Keycloak.
 * Deve ser acessada por navegação completa do browser (não via server action).
 */
export async function GET(request: NextRequest) {
  const secure = (process.env.AUTH_URL ?? "").startsWith("https://");

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: secure,
  });

  const authUrl = getAuthUrl();
  const loginUrl = `${authUrl}/login`;
  const issuer = getKeycloakIssuer();
  const idToken =
    typeof token?.idToken === "string" ? token.idToken : undefined;
  const clientId = process.env.AUTH_KEYCLOAK_ID;

  let destination = loginUrl;
  if (isKeycloakConfigured() && issuer && clientId) {
    const params = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: loginUrl,
    });
    if (idToken) {
      params.set("id_token_hint", idToken);
    }
    destination = `${issuer}/protocol/openid-connect/logout?${params.toString()}`;
  }

  const response = NextResponse.redirect(destination);
  for (const name of AUTH_COOKIES) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      secure: name.startsWith("__Secure-") || secure,
    });
  }
  return response;
}
