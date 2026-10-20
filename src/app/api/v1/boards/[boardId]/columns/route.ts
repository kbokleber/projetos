import { withApi } from "@/lib/api/with-api";
import { apiOk, apiError } from "@/lib/api/response";
import { columnService } from "@/services/boards";
import { boardParamsSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "projects:read", paramsSchema: boardParamsSchema },
  async ({ params }) => {
    const columns = await columnService.listByBoard(params.boardId);
    return apiOk({ data: columns });
  },
);

/** Etapas do quadro só podem ser criadas pela UI — não pela API. */
export const POST = withApi(
  { requireScope: "projects:write", paramsSchema: boardParamsSchema },
  async () => {
    return apiError(
      "FORBIDDEN",
      "Criação de etapas do quadro só é permitida pela interface do sistema.",
      403,
    );
  },
);
