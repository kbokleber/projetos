import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Sem workspace.{" "}
        <Link href="/settings/workspaces" className="text-primary underline">
          Criar workspace
        </Link>
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: {
      archivedAt: null,
      workspaceId: active.id,
      OR: [
        { members: { some: { userId: session.user.id } } },
        {
          workspace: {
            is: {
              members: { some: { userId: session.user.id } },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: { where: { archivedAt: null } } } },
      members: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Projetos de <strong>{active.name}</strong>.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">+ Novo projeto</Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="flex items-center gap-2">
                {p.color && (
                  <span
                    className="size-3 rounded-sm"
                    style={{ background: p.color }}
                  />
                )}
                <h3 className="font-medium tracking-tight">{p.name}</h3>
              </div>
              {p.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {p.description}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.status}</span>
                <span>{p._count.tasks} tarefas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <p className="text-sm font-medium">Você ainda não tem projetos</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Crie seu primeiro projeto para começar a organizar tarefas em um quadro
        Kanban.
      </p>
      <Button asChild>
        <Link href="/projects/new">Criar projeto</Link>
      </Button>
    </div>
  );
}
