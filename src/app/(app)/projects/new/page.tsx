import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProjectForm } from "@/features/projects/project-form";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { AppError } from "@/lib/errors";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let workspaces;
  let active;
  try {
    const resolved = await resolveActiveWorkspace(session.user.id);
    workspaces = resolved.workspaces;
    active = resolved.active;
  } catch (err) {
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      redirect("/api/session/reset");
    }
    throw err;
  }

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Sem workspace
        </h1>
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          Crie um workspace antes de adicionar projetos.{" "}
          <Link href="/settings/workspaces" className="text-primary underline">
            Ir para Workspaces
          </Link>
        </div>
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

      <ProjectForm
        mode="create"
        workspaces={workspaces}
        initialValues={{
          workspaceId: active?.id ?? workspaces[0].id,
          name: "",
          description: null,
          color: null,
          icon: null,
          status: "ACTIVE",
          startDate: null,
          dueDate: null,
        }}
      />
    </div>
  );
}
