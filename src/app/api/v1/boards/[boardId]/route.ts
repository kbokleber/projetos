import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { boardService } from "@/services/boards";
import { boardParamsSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "projects:read", paramsSchema: boardParamsSchema },
  async ({ params }) => {
    const board = await boardService.getById(params.boardId);
    return apiOk(board);
  },
);
