import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { columnService } from "@/services/boards";
import { boardParamsSchema, createColumnSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "projects:read", paramsSchema: boardParamsSchema },
  async ({ params }) => {
    const columns = await columnService.listByBoard(params.boardId);
    return apiOk({ data: columns });
  },
);

export const POST = withApi(
  {
    requireScope: "projects:write",
    schema: createColumnSchema,
    paramsSchema: boardParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof createColumnSchema>;
    const column = await columnService.create(
      { userId: auth.userId, actorType: "API" },
      params.boardId,
      { name: data.name, color: data.color, position: data.position },
    );
    return apiOk(column, { status: 201 });
  },
);
