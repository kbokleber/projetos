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
    return prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    });
  },

  /**
   * Cria um novo usuário (sem workspace) para uso interno/admin.
   * Não faz signup de workspace — o admin adiciona o usuário em workspaces
   * depois pela página de membros do projeto.
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
    return user;
  },
};
