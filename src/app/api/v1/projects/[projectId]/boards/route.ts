import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { z } from "zod";
import { boardService } from "@/services/boards";
import { createBoardSchema, projectParamsSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "projects:read", paramsSchema: projectParamsSchema },
  async ({ params }) => {
    const boards = await boardService.listByProject(params.projectId);
    return apiOk({ data: boards });
  },
);

export const POST = withApi(
  {
    requireScope: "projects:write",
    schema: createBoardSchema,
    paramsSchema: projectParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof createBoardSchema>;
    const board = await boardService.create(
      { userId: auth.userId, actorType: "API" },
      params.projectId,
      { name: data.name, description: data.description },
    );
    return apiOk(board, { status: 201 });
  },
);
