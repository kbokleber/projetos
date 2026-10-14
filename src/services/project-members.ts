/**
 * Membros de projeto — UI e API pública.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { assertProjectAccess, getProjectAccess } from "@/lib/project-access";
import type { ProjectRole } from "@/generated/prisma/client";

const memberInclude = {
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
} as const;

export const projectMemberService = {
  async list(actorUserId: string, projectId: string) {
    await assertProjectAccess(actorUserId, projectId, "view");
    return prisma.projectMember.findMany({
      where: { projectId },
      include: memberInclude,
      orderBy: { createdAt: "asc" },
    });
  },

  async add(
    actorUserId: string,
    projectId: string,
    input: { email?: string; userId?: string; role: "ADMIN" | "MEMBER" | "VIEWER" },
  ) {
    await assertProjectAccess(actorUserId, projectId, "manageMembers");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    let invited =
      input.userId
        ? await prisma.user.findUnique({ where: { id: input.userId } })
        : input.email
          ? await prisma.user.findUnique({ where: { email: input.email } })
          : null;

    if (!invited) {
      throw new AppError("NOT_FOUND", "Usuário não encontrado.", 404);
    }
    if (!invited.active) {
      throw new AppError("VALIDATION_ERROR", "Usuário inativo.", 400);
    }

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: invited.id,
        },
      },
    });
    if (!workspaceMember) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Usuário não pertence ao workspace deste projeto.",
        400,
      );
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId: invited.id },
      },
      create: {
        projectId,
        userId: invited.id,
        role: input.role,
      },
      update: { role: input.role },
      include: memberInclude,
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId,
        userId: actorUserId,
        actorType: "API",
        actorId: actorUserId,
        action: "member.added",
        entityType: "ProjectMember",
        entityId: invited.id,
        metadata: JSON.stringify({
          email: invited.email,
          role: input.role,
        }),
      },
    });

    return member;
  },

  async remove(actorUserId: string, projectId: string, targetUserId: string) {
    await assertProjectAccess(actorUserId, projectId, "manageMembers");

    const owners = await prisma.projectMember.count({
      where: { projectId, role: "OWNER" },
    });
    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "Membro não encontrado neste projeto.", 404);
    }
    if (target.role === "OWNER" && owners <= 1) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Não é possível remover o último OWNER do projeto.",
        400,
      );
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId,
        userId: actorUserId,
        actorType: "API",
        actorId: actorUserId,
        action: "member.removed",
        entityType: "ProjectMember",
        entityId: targetUserId,
        metadata: JSON.stringify({ removedUserId: targetUserId }),
      },
    });
  },

  async updateRole(
    actorUserId: string,
    projectId: string,
    targetUserId: string,
    role: Exclude<ProjectRole, "OWNER">,
  ) {
    const access = await getProjectAccess(actorUserId, projectId);
    const canChangeRole =
      access?.canManageMembers &&
      (access.projectRole === "OWNER" ||
        access.workspaceRole === "OWNER" ||
        access.workspaceRole === "ADMIN");
    if (!canChangeRole) {
      throw new AppError(
        "FORBIDDEN",
        "Sem permissão para alterar papéis de membros.",
        403,
      );
    }

    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "Membro não encontrado neste projeto.", 404);
    }
    if (target.role === "OWNER") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Não é possível alterar o papel do OWNER por esta rota.",
        400,
      );
    }

    return prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role },
      include: memberInclude,
    });
  },
};
