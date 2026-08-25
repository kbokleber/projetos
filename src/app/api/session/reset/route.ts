import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Limpa cookies de sessão inválida (ex.: userId antigo após reset do banco).
 * Precisa ser Route Handler — Server Components não podem alterar cookies.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const names = cookieStore.getAll().map((c) => c.name);

  const url = new URL("/login?session=expired", request.url);
  const res = NextResponse.redirect(url);

  for (const name of names) {
    if (
      name.includes("authjs") ||
      name.includes("next-auth") ||
      name === "session-token" ||
      name.endsWith(".session-token")
    ) {
      res.cookies.set(name, "", { expires: new Date(0), path: "/" });
    }
  }

  return res;
}
