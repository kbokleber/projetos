import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import {
  taskParamsSchema,
  createCommentSchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "comments:read", paramsSchema: taskParamsSchema },
  async ({ params, auth }) => {
    const task = await taskService.getById(params.taskId, auth.workspaceId);
    const comments = await prisma.comment.findMany({
      where: { taskId: task.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return apiOk({ data: comments });
  },
);

export const POST = withApi(
  {
    requireScope: "comments:write",
    schema: createCommentSchema,
    paramsSchema: taskParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof createCommentSchema>;
    const task = await taskService.getById(params.taskId, auth.workspaceId);

    const userId =
      auth.userId ??
      (await prisma.user.findFirst({
        where: { workspaceMembers: { some: { workspaceId: auth.workspaceId } } },
        select: { id: true },
      }))?.id;

    if (!userId) {
      return apiOk({ error: "FORBIDDEN" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: { taskId: task.id, userId, content: data.content },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        userId,
        actorType: "API",
        actorId: auth.token.id,
        action: "comment.created",
        entityType: "Comment",
        entityId: comment.id,
        metadata: JSON.stringify({ taskId: task.id }),
      },
    });

    return apiOk(comment, { status: 201 });
  },
);
