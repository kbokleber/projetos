/**
 * Service de Reuniões / ATAs — regras de negócio e autorização.
 */

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { MeetingType } from "@/generated/prisma/client";

export type MeetingParticipantInput = {
  memberIds: string[];
  guests: string[];
};

export type CreateMeetingInput = {
  projectId: string;
  title: string;
  type: MeetingType;
  heldAt: Date;
  integrationId?: string | null;
  description?: string;
  published?: boolean;
  participants: MeetingParticipantInput;
  createdBy: string;
};

export type UpdateMeetingInput = {
  title?: string;
  type?: MeetingType;
  heldAt?: Date;
  integrationId?: string | null;
  description?: string;
  published?: boolean;
  participants?: MeetingParticipantInput;
};

async function assertProjectAccess(userId: string, projectId: string) {
  const { assertProjectAccess: assertAccess } = await import(
    "@/lib/project-access"
  );
  const access = await assertAccess(userId, projectId, "view");
  return { id: access.projectId, workspaceId: access.workspaceId };
}

async function assertProjectEditAccess(userId: string, projectId: string) {
  const { assertProjectAccess: assertAccess } = await import(
    "@/lib/project-access"
  );
  const access = await assertAccess(userId, projectId, "edit");
  return { id: access.projectId, workspaceId: access.workspaceId };
}

async function validateMemberIds(projectId: string, memberIds: string[]) {
  if (memberIds.length === 0) return;
  const unique = Array.from(new Set(memberIds));
  const count = await prisma.projectMember.count({
    where: { projectId, userId: { in: unique } },
  });
  if (count !== unique.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Um ou mais participantes não são membros do projeto.",
      400,
    );
  }
}

function buildParticipantCreates(participants: MeetingParticipantInput) {
  const rows: Array<{ userId?: string; guestName?: string }> = [];
  for (const userId of Array.from(new Set(participants.memberIds))) {
    rows.push({ userId });
  }
  for (const guestName of participants.guests) {
    const name = guestName.trim();
    if (name) rows.push({ guestName: name });
  }
  return rows;
}

function ensureShareToken(existing: string | null, published: boolean) {
  if (!published) return existing;
  return existing ?? randomBytes(24).toString("base64url");
}

const meetingInclude = {
  participants: {
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  },
  creator: { select: { id: true, name: true, email: true } },
} as const;

export const meetingService = {
  async listByProject(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId);
    return prisma.meeting.findMany({
      where: { projectId },
      orderBy: { heldAt: "desc" },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { participants: true } },
      },
    });
  },

  /**
   * Lista ATAs/reuniões no workspace (API). Filtra por projeto, tipo, etc.
   */
  async listForApi(opts: {
    workspaceId: string;
    userId?: string | null;
    projectId?: string;
    type?: MeetingType;
    published?: boolean;
    integrationId?: string;
    search?: string;
    take: number;
    cursor?: string | null;
  }) {
    const { projectWhereForUser } = await import("@/lib/project-access");
    const where: Record<string, unknown> = {
      project: {
        workspaceId: opts.workspaceId,
        ...(opts.userId ? { AND: [projectWhereForUser(opts.userId)] } : {}),
      },
    };
    if (opts.projectId) where.projectId = opts.projectId;
    if (opts.type) where.type = opts.type;
    if (opts.published !== undefined) where.published = opts.published;
    if (opts.integrationId) where.integrationId = opts.integrationId;
    if (opts.search) {
      where.title = { contains: opts.search, mode: "insensitive" };
    }

    const cursor = opts.cursor ? { id: opts.cursor } : undefined;
    const items = await prisma.meeting.findMany({
      where,
      orderBy: [{ heldAt: "desc" }, { id: "desc" }],
      take: opts.take + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        project: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    const hasMore = items.length > opts.take;
    const data = hasMore ? items.slice(0, opts.take) : items;
    const last = data[data.length - 1];
    return {
      data,
      pagination: {
        nextCursor: hasMore && last ? last.id : null,
        hasMore,
      },
    };
  },

  async getById(userId: string, meetingId: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: meetingInclude,
    });
    if (!meeting) {
      throw new AppError("NOT_FOUND", "Reunião não encontrada.", 404);
    }
    await assertProjectAccess(userId, meeting.projectId);
    return meeting;
  },

  async getByShareToken(token: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { shareToken: token, published: true },
      include: {
        project: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!meeting) {
      throw new AppError("NOT_FOUND", "Link inválido ou reunião não publicada.", 404);
    }
    return meeting;
  },

  async create(actorUserId: string, input: CreateMeetingInput) {
    await assertProjectEditAccess(actorUserId, input.projectId);
    await validateMemberIds(input.projectId, input.participants.memberIds);

    const published = input.published ?? false;
    const shareToken = ensureShareToken(null, published);

    return prisma.meeting.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        type: input.type,
        heldAt: input.heldAt,
        integrationId: input.integrationId ?? null,
        description: input.description ?? "",
        published,
        shareToken,
        createdBy: input.createdBy,
        participants: {
          create: buildParticipantCreates(input.participants),
        },
      },
      include: meetingInclude,
    });
  },

  async update(actorUserId: string, meetingId: string, input: UpdateMeetingInput) {
    const existing = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        projectId: true,
        published: true,
        shareToken: true,
      },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Reunião não encontrada.", 404);
    }
    await assertProjectEditAccess(actorUserId, existing.projectId);

    if (input.participants) {
      await validateMemberIds(existing.projectId, input.participants.memberIds);
    }

    const nextPublished = input.published ?? existing.published;
    const shareToken = ensureShareToken(existing.shareToken, nextPublished);

    return prisma.$transaction(async (tx) => {
      if (input.participants) {
        await tx.meetingParticipant.deleteMany({ where: { meetingId } });
        const creates = buildParticipantCreates(input.participants);
        if (creates.length > 0) {
          await tx.meetingParticipant.createMany({
            data: creates.map((p) => ({
              meetingId,
              userId: p.userId ?? null,
              guestName: p.guestName ?? null,
            })),
          });
        }
      }

      return tx.meeting.update({
        where: { id: meetingId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.heldAt !== undefined ? { heldAt: input.heldAt } : {}),
          ...(input.integrationId !== undefined
            ? { integrationId: input.integrationId }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.published !== undefined ? { published: input.published } : {}),
          shareToken,
        },
        include: meetingInclude,
      });
    });
  },

  async remove(actorUserId: string, meetingId: string) {
    const existing = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "Reunião não encontrada.", 404);
    }
    await assertProjectEditAccess(actorUserId, existing.projectId);
    await prisma.meeting.delete({ where: { id: meetingId } });
    return { projectId: existing.projectId };
  },
};
