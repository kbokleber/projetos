import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/features/users/create-user-form";
import { UserList } from "@/features/users/user-list";
import { PageHeader } from "@/components/app-shell/page-header";

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
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Apenas administradores podem criar novos usuários. O cadastro público está desabilitado."
      />

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
