import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { loginSchema } from "@/schemas/auth";
import { authService } from "@/services/auth";
import { authConfig } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import type { GlobalRole } from "@/types";
import {
  extractGlobalRoleFromTokens,
  isKeycloakConfigured,
  isKeycloakSignupAllowed,
  isLegacyLoginEnabled,
} from "@/lib/keycloak";

const keycloakConfigured = isKeycloakConfigured();

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(raw) {
      // Sem Keycloak: login legado é o único caminho (qualquer usuário ativo).
      // Com Keycloak: só se LEGACY_LOGIN_ENABLED=true e apenas ADMIN.
      if (keycloakConfigured) {
        if (!isLegacyLoginEnabled()) return null;
      }

      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await authService.verifyCredentials(
        parsed.data.email,
        parsed.data.password,
      );
      if (!user) return null;

      if (keycloakConfigured && user.role !== "ADMIN") {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatarUrl,
        role: user.role,
      };
    },
  }),
  ...(keycloakConfigured
    ? [
        Keycloak({
          clientId: process.env.AUTH_KEYCLOAK_ID!,
          clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
          issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "keycloak") {
        return true;
      }

      const sub = profile?.sub;
      const emailRaw =
        typeof profile?.email === "string" ? profile.email : undefined;
      const emailVerified =
        (profile as { email_verified?: boolean } | undefined)?.email_verified ===
        true;

      if (!sub || !emailRaw) {
        return `/login?error=Configuration`;
      }
      if (!emailVerified) {
        return `/login?error=EmailNotVerified`;
      }

      const role = extractGlobalRoleFromTokens({
        accessToken: account.access_token,
        idToken: account.id_token,
        profile: profile as Record<string, unknown>,
      });
      if (!role) {
        return `/login?error=NoRole`;
      }

      const email = emailRaw.toLowerCase();
      const name =
        (typeof profile?.name === "string" && profile.name) ||
        (typeof (profile as { preferred_username?: string }).preferred_username ===
          "string" &&
          (profile as { preferred_username?: string }).preferred_username) ||
        email;

      try {
        const bySub = await prisma.user.findUnique({
          where: { keycloakSub: sub },
        });

        if (bySub) {
          if (!bySub.active) return `/login?error=AccessDenied`;
          await prisma.user.update({
            where: { id: bySub.id },
            data: {
              role,
              name: bySub.name || name,
              email: bySub.email || email,
            },
          });
          return true;
        }

        const byEmail = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });

        if (byEmail) {
          if (!byEmail.active) return `/login?error=AccessDenied`;
          if (byEmail.keycloakSub && byEmail.keycloakSub !== sub) {
            console.error(
              "[auth] AccountConflict: email já vinculado a outro keycloakSub",
              { email: byEmail.email, existing: byEmail.keycloakSub, sub },
            );
            return `/login?error=AccountConflict`;
          }
          await prisma.user.update({
            where: { id: byEmail.id },
            data: { keycloakSub: sub, role },
          });
          return true;
        }

        if (!isKeycloakSignupAllowed()) {
          return `/login?error=NoLocalUser`;
        }

        const created = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash: null,
            keycloakSub: sub,
            role,
          },
        });
        await authService.ensureWorkspaceMembership(created.id);
        return true;
      } catch (err) {
        console.error("[auth] Keycloak signIn error", err);
        return `/login?error=Configuration`;
      }
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "keycloak") {
        if (account.id_token) {
          token.idToken = account.id_token;
        }

        // Auth.js v5 sem adapter: token.sub NÃO é o sub do Keycloak.
        // O sub correto vem de providerAccountId (ou profile.sub).
        const sub =
          (typeof account.providerAccountId === "string" &&
            account.providerAccountId) ||
          (typeof (profile as { sub?: string } | undefined)?.sub === "string" &&
            (profile as { sub: string }).sub) ||
          (typeof token.sub === "string" ? token.sub : undefined);

        if (sub) {
          const local = await prisma.user.findUnique({
            where: { keycloakSub: sub },
            select: { id: true, role: true },
          });
          if (local) {
            token.id = local.id;
            token.role = local.role;
          }
        }
        return token;
      }

      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: GlobalRole }).role;
      }
      return token;
    },
  },
});
