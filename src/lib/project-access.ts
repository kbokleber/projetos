/**
 * Acesso a projetos: ProjectMember explícito, ou Workspace OWNER/ADMIN.
 * Membros comuns do workspace NÃO veem projetos sem vínculo.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { Prisma, ProjectRole, WorkspaceRole } from "@/generated/prisma/client";

export type ProjectAccess = {
  projectId: string;
  workspaceId: string;
  /** Role no projeto, se for ProjectMember. */
  projectRole: ProjectRole | null;
  /** Role no workspace. */
  workspaceRole: WorkspaceRole | null;
  /** Pode ver o projeto. */
  canView: boolean;
  /** Pode editar conteúdo (não VIEWER). */
  canEdit: boolean;
  /** Pode gerenciar membros do projeto. */
  canManageMembers: boolean;
};

/** Filtro Prisma: projetos que o usuário pode listar/abrir. */
export function projectWhereForUser(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { members: { some: { userId } } },
      {
        workspace: {
          is: {
            members: {
              some: { userId, role: { in: ["OWNER", "ADMIN"] } },
            },
          },
        },
      },
    ],
  };
}

export async function getProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      workspaceId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
      workspace: {
        select: {
          members: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!project) return null;

  const projectRole = project.members[0]?.role ?? null;
  const workspaceRole = project.workspace.members[0]?.role ?? null;
  const isWsAdmin =
    workspaceRole === "OWNER" || workspaceRole === "ADMIN";
  const canView = !!projectRole || isWsAdmin;
  if (!canView) {
    return {
      projectId: project.id,
      workspaceId: project.workspaceId,
      projectRole,
      workspaceRole,
      canView: false,
      canEdit: false,
      canManageMembers: false,
    };
  }

  const canEdit =
    isWsAdmin || (!!projectRole && projectRole !== "VIEWER");
  const canManageMembers =
    isWsAdmin ||
    projectRole === "OWNER" ||
    projectRole === "ADMIN";

  return {
    projectId: project.id,
    workspaceId: project.workspaceId,
    projectRole,
    workspaceRole,
    canView: true,
    canEdit,
    canManageMembers,
  };
}

export async function assertProjectAccess(
  userId: string,
  projectId: string,
  mode: "view" | "edit" | "manageMembers" = "view",
): Promise<ProjectAccess> {
  const access = await getProjectAccess(userId, projectId);
  if (!access || !access.canView) {
    throw new AppError("FORBIDDEN", "Sem acesso a este projeto.", 403);
  }
  if (mode === "edit" && !access.canEdit) {
    throw new AppError("FORBIDDEN", "Sem permissão neste projeto.", 403);
  }
  if (mode === "manageMembers" && !access.canManageMembers) {
    throw new AppError(
      "FORBIDDEN",
      "Sem permissão para gerenciar membros.",
      403,
    );
  }
  return access;
}

/** Filtro para tarefas cujo projeto o usuário pode acessar. */
export function taskProjectAccessWhere(
  userId: string,
): Prisma.ProjectWhereInput {
  return projectWhereForUser(userId);
}
