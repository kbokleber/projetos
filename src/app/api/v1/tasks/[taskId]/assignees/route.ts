import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { taskService } from "@/services/tasks";

export const dynamic = "force-dynamic";
import {
  taskParamsSchema,
  addAssigneeSchema,
} from "@/schemas/api";

export const POST = withApi(
  {
    requireScope: "tasks:write",
    schema: addAssigneeSchema,
    paramsSchema: taskParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof addAssigneeSchema>;
    const result = await taskService.addAssignee(
      { userId: auth.userId, actorType: "API" },
      params.taskId,
      data.userId,
    );
    return apiOk(result, { status: 201 });
  },
);
