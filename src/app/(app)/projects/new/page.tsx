import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/features/projects/project-form";
import { authService } from "@/services/auth";
import { AppError } from "@/lib/errors";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Garante vínculo com workspace (usuários criados pelo admin antes do fix)
  try {
    await authService.ensureWorkspaceMembership(session.user.id);
  } catch (err) {
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      redirect("/login?session=expired");
    }
    throw err;
  }

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Sem workspace
        </h1>
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          Não foi possível criar ou associar um workspace. Tente novamente ou
          peça ao administrador.
        </div>
        <Link
          href="/projects"
          className="mt-3 inline-block text-sm text-primary underline"
        >
          Voltar para Projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projetos
          </Link>
          <span>/</span>
          <span className="text-foreground">Novo</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">
          Novo projeto
        </h1>
        <p className="text-sm text-muted-foreground">
          Um board Kanban com colunas padrão será criado automaticamente.
        </p>
      </div>

      <ProjectForm mode="create" workspaces={workspaces} />
    </div>
  );
}
