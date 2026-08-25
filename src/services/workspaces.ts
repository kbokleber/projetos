import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { workspaceRepository } from "@/repositories/auth";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireMembership(
  userId: string,
  workspaceId: string,
  roles?: Array<"OWNER" | "ADMIN" | "MEMBER">,
) {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: { id: true, role: true },
  });
  if (!member) {
    throw new AppError("FORBIDDEN", "Você não pertence a este workspace.", 403);
  }
  if (roles && !roles.includes(member.role)) {
    throw new AppError(
      "FORBIDDEN",
      "Você não tem permissão para esta ação.",
      403,
    );
  }
  return member;
}

export const workspaceService = {
  async listForUser(userId: string) {
    return prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        members: {
          where: { userId },
          select: { role: true },
          take: 1,
        },
        _count: {
          select: {
            members: true,
            projects: { where: { archivedAt: null } },
          },
        },
      },
    });
  },

  async create(
    userId: string,
    input: { name: string; slug?: string; description?: string | null },
  ) {
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!slug) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Informe um nome ou slug válido.",
        400,
      );
    }

    const taken = await workspaceRepository.findBySlug(slug);
    if (taken) {
      throw new AppError(
        "CONFLICT",
        "Já existe um workspace com este identificador.",
        409,
      );
    }

    return workspaceRepository.createWithOwner({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      ownerId: userId,
    });
  },

  async listMembers(userId: string, workspaceId: string) {
    await requireMembership(userId, workspaceId);
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async addMemberByEmail(
    actorId: string,
    input: {
      workspaceId: string;
      email: string;
      role: "ADMIN" | "MEMBER";
    },
  ) {
    await requireMembership(actorId, input.workspaceId, ["OWNER", "ADMIN"]);

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { id: true, name: true, email: true, active: true },
    });
    if (!user || !user.active) {
      throw new AppError(
        "NOT_FOUND",
        "Nenhum usuário ativo encontrado com este e-mail.",
        404,
      );
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: user.id,
        },
      },
    });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "Este usuário já pertence ao workspace.",
        409,
      );
    }

    return prisma.workspaceMember.create({
      data: {
        workspaceId: input.workspaceId,
        userId: user.id,
        role: input.role,
      },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async removeMember(actorId: string, workspaceId: string, memberId: string) {
    const actor = await requireMembership(actorId, workspaceId, [
      "OWNER",
      "ADMIN",
    ]);

    const target = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      select: { id: true, userId: true, role: true },
    });
    if (!target) {
      throw new AppError("NOT_FOUND", "Membro não encontrado.", 404);
    }
    if (target.role === "OWNER") {
      throw new AppError(
        "FORBIDDEN",
        "Não é possível remover o dono do workspace.",
        403,
      );
    }
    if (target.userId === actorId) {
      throw new AppError(
        "FORBIDDEN",
        "Você não pode remover a si mesmo.",
        403,
      );
    }
    if (actor.role === "ADMIN" && target.role === "ADMIN") {
      throw new AppError(
        "FORBIDDEN",
        "Admins não podem remover outros admins.",
        403,
      );
    }

    await prisma.workspaceMember.delete({ where: { id: target.id } });
  },
};
