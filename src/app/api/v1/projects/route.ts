import { z } from "zod";
import { projectService } from "@/services/projects";
import { withApi } from "@/lib/api/with-api";
import { apiError, apiOk } from "@/lib/api/response";
import { resolveApiWorkspace } from "@/lib/api/resolve-workspace";

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

    const workspace = await resolveApiWorkspace({
      userId: auth.userId,
      fallbackWorkspaceId: auth.workspaceId,
      workspaceId: parsed.data.workspaceId,
      workspaceSlug: parsed.data.workspaceSlug,
      workspace: parsed.data.workspace,
    });

    const result = await projectService.list(workspace.id, {
      status: parsed.data.status,
      search: parsed.data.search,
      take: parsed.data.limit,
      cursor: parsed.data.cursor,
    });
    return apiOk({
      ...result,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
    });
  },
);

export const POST = withApi(
  {
    requireScope: "projects:write",
    schema: createProjectSchema,
  },
  async ({ auth, body }) => {
    const data = body as z.infer<typeof createProjectSchema>;

    const workspace = await resolveApiWorkspace({
      userId: auth.userId,
      fallbackWorkspaceId: auth.workspaceId,
      workspaceId: data.workspaceId,
      workspaceSlug: data.workspaceSlug,
      workspace: data.workspace,
    });

    const project = await projectService.create(
      { userId: auth.userId, actorType: "API" },
      {
        workspaceId: workspace.id,
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
    return apiOk(
      {
        ...project,
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        },
      },
      { status: 201 },
    );
  },
);
