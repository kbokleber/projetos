import type { NextAuthConfig } from "next-auth";
import type { GlobalRole } from "@/types";

/**
 * Configuração edge-safe do NextAuth (sem providers que usam Node APIs).
 * Providers como Credentials (com bcrypt) são adicionados em `auth.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt" as const },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: GlobalRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as GlobalRole | undefined) ?? "USER";
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/docs") ||
        pathname.startsWith("/api/openapi") ||
        pathname.startsWith("/api/v1") || // API pública usa Bearer, não sessão
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon");
      if (isPublic) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
