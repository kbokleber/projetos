import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";

export const dynamic = "force-dynamic";
import {
  taskParamsSchema,
  updateTaskSchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "tasks:read", paramsSchema: taskParamsSchema },
  async ({ params, auth }) => {
    const task = await taskService.getById(params.taskId, auth.workspaceId);
    return apiOk(task);
  },
);

export const PATCH = withApi(
  {
    requireScope: "tasks:write",
    paramsSchema: taskParamsSchema,
    schema: updateTaskSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof updateTaskSchema>;
    const updated = await taskService.update(
      { userId: auth.userId, actorType: "API", workspaceId: auth.workspaceId },
      params.taskId,
      {
        title: data.title,
        description: data.description,
        priority: data.priority,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedHours: data.estimatedHours,
        columnId: data.columnId,
        position: data.position,
        completed: data.completed,
        archived: data.archived,
        externalId: data.externalId,
        externalSource: data.externalSource,
      },
    );
    return apiOk(updated);
  },
);

export const DELETE = withApi(
  {
    requireScope: "tasks:write",
    paramsSchema: taskParamsSchema,
  },
  async ({ auth, params }) => {
    await taskService.delete(
      { userId: auth.userId, actorType: "API", workspaceId: auth.workspaceId },
      params.taskId,
    );
    return new Response(null, { status: 204 });
  },
);
