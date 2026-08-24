import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";

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
    const updated = await taskService.move(
      { userId: auth.userId, actorType: "API", workspaceId: auth.workspaceId },
      params.taskId,
      { columnId: data.columnId, position: data.position },
    );
    return apiOk(updated);
  },
);
