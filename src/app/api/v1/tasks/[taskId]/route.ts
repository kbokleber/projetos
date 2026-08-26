import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";
import { resolveTaskAccessForApi } from "@/lib/api/resolve-workspace";
import type { UpdateTaskInput } from "@/services/tasks";

export const dynamic = "force-dynamic";
import {
  taskParamsSchema,
  updateTaskSchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "tasks:read", paramsSchema: taskParamsSchema },
  async ({ params, auth }) => {
    const access = await resolveTaskAccessForApi({
      userId: auth.userId,
      taskId: params.taskId,
    });
    const task = await taskService.getById(params.taskId, access.workspaceId);
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
    const access = await resolveTaskAccessForApi({
      userId: auth.userId,
      taskId: params.taskId,
    });

    // PATCH parcial: só envia campos presentes no body
    const patch: UpdateTaskInput = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.startDate !== undefined) {
      patch.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.dueDate !== undefined) {
      patch.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.estimatedHours !== undefined) {
      patch.estimatedHours = data.estimatedHours;
    }
    if (data.columnId !== undefined) patch.columnId = data.columnId;
    if (data.position !== undefined) patch.position = data.position;
    if (data.completed !== undefined) patch.completed = data.completed;
    if (data.archived !== undefined) patch.archived = data.archived;
    if (data.externalId !== undefined) patch.externalId = data.externalId;
    if (data.externalSource !== undefined) {
      patch.externalSource = data.externalSource;
    }

    const updated = await taskService.update(
      {
        userId: auth.userId,
        actorType: "API",
        workspaceId: access.workspaceId,
      },
      params.taskId,
      patch,
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
    const access = await resolveTaskAccessForApi({
      userId: auth.userId,
      taskId: params.taskId,
    });
    await taskService.delete(
      {
        userId: auth.userId,
        actorType: "API",
        workspaceId: access.workspaceId,
      },
      params.taskId,
    );
    return new Response(null, { status: 204 });
  },
);
