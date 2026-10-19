import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { PageHeader } from "@/components/app-shell/page-header";
import { prisma } from "@/lib/prisma";
import {
  getKeycloakAccountUrl,
  isKeycloakConfigured,
} from "@/lib/keycloak";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  const hasLocalPassword = Boolean(dbUser?.passwordHash);
  const keycloakOn = isKeycloakConfigured();
  const keycloakAccountUrl = getKeycloakAccountUrl();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Minha conta"
        description={
          <>
            {session.user.name} · {session.user.email}
          </>
        }
      />

      {hasLocalPassword ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">Alterar senha</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Informe a senha atual e escolha uma nova. Após salvar, use a nova
            senha no próximo login.
          </p>
          <ChangePasswordForm />
        </section>
      ) : keycloakOn && keycloakAccountUrl ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-medium">Senha e conta</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Esta conta autentica pelo Keycloak. Altere senha, MFA e dados
            pessoais no portal da conta KBO.
          </p>
          <a
            href={keycloakAccountUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Abrir conta Keycloak
          </a>
        </section>
      ) : null}
    </div>
  );
}
