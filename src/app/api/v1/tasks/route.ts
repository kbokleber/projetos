import { withApi } from "@/lib/api/with-api";
import { apiError, apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";

export const dynamic = "force-dynamic";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "tasks:read" },
  async ({ req, auth }) => {
    const url = new URL(req.url);
    const parsed = listTasksQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Query inválida.", 400);
    }

    const result = await taskService.list({
      workspaceId: auth.workspaceId,
      projectId: parsed.data.projectId,
      boardId: parsed.data.boardId,
      columnId: parsed.data.columnId,
      assigneeId: parsed.data.assigneeId,
      priority: parsed.data.priority,
      labelId: parsed.data.labelId,
      status: parsed.data.status,
      dueBefore: parsed.data.dueBefore ? new Date(parsed.data.dueBefore) : undefined,
      dueAfter: parsed.data.dueAfter ? new Date(parsed.data.dueAfter) : undefined,
      search: parsed.data.search,
      externalSource: parsed.data.externalSource,
      externalId: parsed.data.externalId,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    return apiOk(result);
  },
);

export const POST = withApi(
  {
    requireScope: "tasks:write",
    schema: createTaskSchema,
  },
  async ({ auth, body }) => {
    const data = body as z.infer<typeof createTaskSchema>;
    const task = await taskService.create(
      { userId: auth.userId, actorType: "API" },
      {
        projectId: data.projectId,
        boardId: data.boardId,
        columnId: data.columnId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        position: data.position,
        externalId: data.externalId,
        externalSource: data.externalSource,
        assigneeIds: data.assigneeIds,
        createdBy: auth.userId ?? auth.token.id,
      },
    );
    return apiOk(task, { status: 201 });
  },
);
