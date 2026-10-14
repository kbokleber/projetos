import { z } from "zod";
import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { projectMemberService } from "@/services/project-members";
import {
  addProjectMemberSchema,
  projectParamsSchema,
} from "@/schemas/api";

export const dynamic = "force-dynamic";

export const GET = withApi(
  { requireScope: "members:read", paramsSchema: projectParamsSchema },
  async ({ auth, params }) => {
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    const members = await projectMemberService.list(
      auth.userId,
      params.projectId,
    );
    return apiOk(members);
  },
);

export const POST = withApi(
  {
    requireScope: "members:write",
    schema: addProjectMemberSchema,
    paramsSchema: projectParamsSchema,
  },
  async ({ auth, params, body }) => {
    if (!auth.userId) {
      throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
    }
    const data = body as z.infer<typeof addProjectMemberSchema>;
    const member = await projectMemberService.add(
      auth.userId,
      params.projectId,
      {
        email: data.email,
        userId: data.userId,
        role: data.role,
      },
    );
    return apiOk(member, { status: 201 });
  },
);
