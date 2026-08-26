import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";
import { resolveTaskAccessForApi } from "@/lib/api/resolve-workspace";

export const dynamic = "force-dynamic";
import {
  taskParamsSchema,
  moveTaskSchema,
} from "@/schemas/api";

export const POST = withApi(
  {
    requireScope: "tasks:write",
    schema: moveTaskSchema,
    paramsSchema: taskParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof moveTaskSchema>;
    const access = await resolveTaskAccessForApi({
      userId: auth.userId,
      taskId: params.taskId,
    });
    const updated = await taskService.move(
      {
        userId: auth.userId,
        actorType: "API",
        workspaceId: access.workspaceId,
      },
      params.taskId,
      { columnId: data.columnId, position: data.position },
    );
    return apiOk(updated);
  },
);
