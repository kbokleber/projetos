import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { taskService } from "@/services/tasks";
import { taskAssigneeParamsSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const DELETE = withApi(
  {
    requireScope: "tasks:write",
    paramsSchema: taskAssigneeParamsSchema,
  },
  async ({ auth, params }) => {
    const result = await taskService.removeAssignee(
      { userId: auth.userId, actorType: "API" },
      params.taskId,
      params.userId,
    );
    return apiOk(result);
  },
);
