import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  userRepository,
  workspaceRepository,
  passwordResetRepository,
} from "@/repositories/auth";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MIN = 60;

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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const authService = {
  async signup(input: {
    name: string;
    email: string;
    password: string;
    workspaceName: string;
    workspaceSlug?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "Já existe um usuário com este e-mail.",
        409,
      );
    }

    const slug = input.workspaceSlug
      ? slugify(input.workspaceSlug)
      : slugify(input.workspaceName);

    const slugTaken = await workspaceRepository.findBySlug(slug);
    if (slugTaken) {
      throw new AppError(
        "CONFLICT",
        "Já existe um workspace com este identificador.",
        409,
      );
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await userRepository.create({
      name: input.name,
      email,
      passwordHash,
    });

    await workspaceRepository.createWithOwner({
      name: input.workspaceName,
      slug,
      ownerId: user.id,
    });

    return user;
  },

  async verifyCredentials(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash || !user.active) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return user;
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    // Não revelar se o e-mail existe. Retornar sempre um identificador.
    if (!user) {
      return { delivered: false as const };
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000,
    );

    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return { delivered: true as const, token, email: user.email };
  },

  async resetPassword(input: { token: string; password: string }) {
    const tokenHash = hashToken(input.token);
    const record = await passwordResetRepository.findValid(tokenHash);
    if (!record) {
      throw new AppError("VALIDATION_ERROR", "Token inválido ou expirado.", 400);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await userRepository.updatePassword(record.userId, passwordHash);
    await passwordResetRepository.markUsed(record.id);

    return record.user;
  },

  async getActiveWorkspaces(userId: string) {
    await this.ensureWorkspaceMembership(userId);
    return prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    });
  },

  /**
   * Garante que o usuário pertença a pelo menos um workspace.
   * - Se já for membro: não faz nada
   * - Se existir workspace: adiciona como MEMBER
   * - Se não existir: cria "Workspace Principal" e coloca como OWNER
   */
  async ensureWorkspaceMembership(userId: string) {
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { id: true, workspaceId: true },
    });
    if (existing) return existing;

    const workspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!workspace) {
      const created = await prisma.workspace.create({
        data: {
          name: "Workspace Principal",
          slug: "principal",
          description: "Workspace padrão do sistema",
          members: {
            create: { userId, role: "OWNER" },
          },
        },
        select: { id: true },
      });
      return { id: "new", workspaceId: created.id };
    }

    const membership = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "MEMBER",
      },
      select: { id: true, workspaceId: true },
    });
    return membership;
  },

  /**
   * Cria um novo usuário e adiciona ao workspace padrão.
   */
  async createUserByAdmin(input: {
    name: string;
    email: string;
    password: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "Já existe um usuário com este e-mail.",
        409,
      );
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      name: input.name,
      email,
      passwordHash,
    });
    await this.ensureWorkspaceMembership(user.id);
    return user;
  },
};
