import { prisma } from "@/lib/prisma";

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string | null;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        avatarUrl: data.avatarUrl ?? null,
      },
    });
  },

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },
};

export const workspaceRepository = {
  async findBySlug(slug: string) {
    return prisma.workspace.findUnique({ where: { slug } });
  },

  async createWithOwner(data: {
    name: string;
    slug: string;
    description?: string | null;
    ownerId: string;
  }) {
    return prisma.workspace.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        members: {
          create: { userId: data.ownerId, role: "OWNER" },
        },
      },
    });
  },
};

export const passwordResetRepository = {
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({ data });
  },

  async findValid(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  },

  async markUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
