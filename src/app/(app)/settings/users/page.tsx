import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/features/users/create-user-form";
import { UserList } from "@/features/users/user-list";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");

  if (me.role !== "ADMIN") {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <h1 className="mb-1 text-base font-semibold text-destructive">
          Acesso negado
        </h1>
        <p className="text-muted-foreground">
          Esta página é restrita a administradores do sistema.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Users className="size-5" />
          Usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem criar novos usuários. O cadastro público
          está desabilitado.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Criar novo usuário</h2>
        <CreateUserForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Usuários cadastrados</h2>
        <UserList currentUserId={me.id} />
      </section>
    </div>
  );
}
