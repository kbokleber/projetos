import { withApi } from "@/lib/api/with-api";
import { apiError } from "@/lib/api/response";
import { columnParamsSchema } from "@/schemas/api";

export const dynamic = "force-dynamic";

/** Etapas do quadro só podem ser alteradas pela UI — não pela API. */
export const PATCH = withApi(
  { requireScope: "projects:write", paramsSchema: columnParamsSchema },
  async () => {
    return apiError(
      "FORBIDDEN",
      "Alteração de etapas do quadro só é permitida pela interface do sistema.",
      403,
    );
  },
);

export const DELETE = withApi(
  { requireScope: "projects:write", paramsSchema: columnParamsSchema },
  async () => {
    return apiError(
      "FORBIDDEN",
      "Exclusão de etapas do quadro só é permitida pela interface do sistema.",
      403,
    );
  },
);
