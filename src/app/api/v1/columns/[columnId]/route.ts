import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { columnService } from "@/services/boards";
import { columnParamsSchema, updateColumnSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  {
    requireScope: "projects:write",
    schema: updateColumnSchema,
    paramsSchema: columnParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof updateColumnSchema>;
    const updated = await columnService.update(
      { userId: auth.userId, actorType: "API" },
      params.columnId,
      { name: data.name, color: data.color, position: data.position },
    );
    return apiOk(updated);
  },
);
