import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/features/projects/project-form";
import { unarchiveProjectAction } from "@/features/projects/actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { where: { userId: session.user.id }, select: { role: true } },
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!project) notFound();
  const myMembership = project.members[0];
  const isWsMember = !myMembership
    ? !!(await prisma.workspaceMember.findFirst({
        where: { workspaceId: project.workspace.id, userId: session.user.id },
        select: { id: true },
      }))
    : false;
  const canEdit =
    (!!myMembership && myMembership.role !== "VIEWER") || isWsMember;
  if (!canEdit) {
    redirect(`/projects/${projectId}`);
  }

  const isArchived = !!project.archivedAt;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projetos
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">Editar</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar projeto
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados do projeto. O workspace não pode ser alterado.
        </p>
      </div>

      {isArchived && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Este projeto está arquivado.{" "}
          <form action={unarchiveProjectAction.bind(null, projectId)} className="inline">
            <button
              type="submit"
              className="font-medium underline underline-offset-2"
            >
              Desarquivar
            </button>
          </form>{" "}
          para voltar a vê-lo no Kanban.
        </div>
      )}

      <ProjectForm
        mode="edit"
        projectId={projectId}
        initialValues={{
          workspaceId: project.workspace.id,
          name: project.name,
          description: project.description,
          color: project.color,
          icon: project.icon,
          status: project.status,
          startDate: project.startDate?.toISOString() ?? null,
          dueDate: project.dueDate?.toISOString() ?? null,
        }}
        workspaces={[{ id: project.workspace.id, name: project.workspace.name }]}
        showArchive={!isArchived}
        archiveLabel="Arquivar projeto"
      />

      <Link
        href={`/projects/${projectId}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Voltar para o projeto
      </Link>

      <Button variant="ghost" asChild className="hidden">
        <Link href="/projects">.</Link>
      </Button>
    </div>
  );
}
