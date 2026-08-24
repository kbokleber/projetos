import { z } from "zod";
import { projectService } from "@/services/projects";
import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";

export const dynamic = "force-dynamic";
import {
  projectParamsSchema,
  updateProjectSchema,
} from "@/schemas/api";

export const GET = withApi(
  { requireScope: "projects:read", paramsSchema: projectParamsSchema },
  async ({ params }) => {
    const project = await projectService.getById(params.projectId);
    return apiOk(project);
  },
);

export const PATCH = withApi(
  {
    requireScope: "projects:write",
    schema: updateProjectSchema,
    paramsSchema: projectParamsSchema,
  },
  async ({ auth, params, body }) => {
    const data = body as z.infer<typeof updateProjectSchema>;
    const updated = await projectService.update(
      { userId: auth.userId, actorType: "API" },
      params.projectId,
      {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        archived: data.archived,
      },
    );
    return apiOk(updated);
  },
);

export const DELETE = withApi(
  {
    requireScope: "projects:write",
    paramsSchema: projectParamsSchema,
  },
  async ({ auth, params }) => {
    await projectService.archive(
      { userId: auth.userId, actorType: "API" },
      params.projectId,
    );
    return new Response(null, { status: 204 });
  },
);
