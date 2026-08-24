import { z } from "zod";
import { projectService } from "@/services/projects";
import { withApi } from "@/lib/api/with-api";
import { apiError, apiOk } from "@/lib/api/response";

export const dynamic = "force-dynamic";
import {
  createProjectSchema,
  listProjectsQuerySchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "projects:read" },
  async ({ req, auth }) => {
    const url = new URL(req.url);
    const parsed = listProjectsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        `Query inválida: ${parsed.error.issues.map((i) => i.path.join(".") || i.message).join("; ")}`,
        400,
      );
    }

    const result = await projectService.list(auth.workspaceId, {
      status: parsed.data.status,
      search: parsed.data.search,
      take: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    return apiOk(result);
  },
);

export const POST = withApi(
  {
    requireScope: "projects:write",
    schema: createProjectSchema,
  },
  async ({ auth, body }) => {
    const data = body as z.infer<typeof createProjectSchema>;
    const workspaceId = data.workspaceId ?? auth.workspaceId;

    const project = await projectService.create(
      { userId: auth.userId, actorType: "API" },
      {
        workspaceId,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdBy: auth.userId ?? auth.token.id,
      },
    );
    return apiOk(project, { status: 201 });
  },
);
