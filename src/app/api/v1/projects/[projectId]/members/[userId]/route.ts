import { z } from "zod";
import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { projectMemberService } from "@/services/project-members";
import {
  projectMemberParamsSchema,
  updateProjectMemberSchema,
} from "@/schemas/api";

export const dynamic = "force-dynamic";

export const PATCH = withApi(
  {
    requireScope: "members:write",
    schema: updateProjectMemberSchema,
    paramsSchema: projectMemberParamsSchema,
  },
  async ({ auth, params, body }) => {
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    const data = body as z.infer<typeof updateProjectMemberSchema>;
    const member = await projectMemberService.updateRole(
      auth.userId,
      params.projectId,
      params.userId,
      data.role,
    );
    return apiOk(member);
  },
);

export const DELETE = withApi(
  {
    requireScope: "members:write",
    paramsSchema: projectMemberParamsSchema,
  },
  async ({ auth, params }) => {
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    await projectMemberService.remove(
      auth.userId,
      params.projectId,
      params.userId,
    );
    return new Response(null, { status: 204 });
  },
);