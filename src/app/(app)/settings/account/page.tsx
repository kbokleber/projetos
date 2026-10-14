import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChangePasswordForm } from "@/features/auth/change-password-form";

export const dynamic = "force-dynamic";

export default async function SettingsAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Conta</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
        <p className="text-sm text-muted-foreground">
          {session.user.name} · {session.user.email}
        </p>
      </div>

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
