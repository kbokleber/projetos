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
 * Encerra a sessão local e, se houver id_token do Keycloak,
 * redireciona para o end-session do IdP.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const authUrl = getAuthUrl();
  const loginUrl = `${authUrl}/login`;
  const issuer = getKeycloakIssuer();
  const idToken =
    typeof token?.idToken === "string" ? token.idToken : undefined;

  let destination = loginUrl;
  if (isKeycloakConfigured() && issuer && idToken) {
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: loginUrl,
    });
    destination = `${issuer}/protocol/openid-connect/logout?${params.toString()}`;
  }

  const response = NextResponse.redirect(destination);
  for (const name of AUTH_COOKIES) {
    response.cookies.set(name, "", { expires: new Date(0), path: "/" });
  }
  return response;
}
