import { withApi } from "@/lib/api/with-api";
import { apiError, apiOk } from "@/lib/api/response";
import { z } from "zod";
import { meetingService } from "@/services/meetings";
import { resolveApiWorkspace } from "@/lib/api/resolve-workspace";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  createMeetingSchema,
  listMeetingsQuerySchema,
} from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "meetings:read" },
  async ({ req, auth }) => {
    const url = new URL(req.url);
    const parsed = listMeetingsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Query inválida.", 400);
    }

    const workspace = await resolveApiWorkspace({
      userId: auth.userId,
      fallbackWorkspaceId: auth.workspaceId,
    });

    if (parsed.data.projectId && auth.userId) {
      const { projectWhereForUser } = await import("@/lib/project-access");
      const project = await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          workspaceId: workspace.id,
          AND: [projectWhereForUser(auth.userId)],
        },
        select: { id: true },
      });
      if (!project) {
        return apiError("NOT_FOUND", "Projeto não encontrado neste workspace.", 404);
      }
    } else if (parsed.data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: parsed.data.projectId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });
      if (!project) {
        return apiError("NOT_FOUND", "Projeto não encontrado neste workspace.", 404);
      }
    }

    const result = await meetingService.listForApi({
      workspaceId: workspace.id,
      userId: auth.userId,
      projectId: parsed.data.projectId,
      type: parsed.data.type,
      published: parsed.data.published,
      integrationId: parsed.data.integrationId,
      search: parsed.data.search,
      take: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    return apiOk(result);
  },
);

export const POST = withApi(
  {
    requireScope: "meetings:write",
    schema: createMeetingSchema,
  },
  async ({ auth, body }) => {
    const data = body as z.infer<typeof createMeetingSchema>;
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }

    const meeting = await meetingService.create(auth.userId, {
      projectId: data.projectId,
      title: data.title,
      type: data.type,
      heldAt: new Date(data.heldAt),
      integrationId: data.integrationId,
      description: data.description,
      published: data.published,
      participants: {
        memberIds: data.memberIds,
        guests: data.guests,
      },
      createdBy: auth.userId,
    });
    return apiOk(meeting, { status: 201 });
  },
);
