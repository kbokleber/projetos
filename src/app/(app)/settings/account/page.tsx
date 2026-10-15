import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { PageHeader } from "@/components/app-shell/page-header";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium">Alterar senha</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Informe a senha atual e escolha uma nova. Após salvar, use a nova
          senha no próximo login.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
