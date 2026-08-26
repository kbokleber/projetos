import { withApi } from "@/lib/api/with-api";
import { apiOk } from "@/lib/api/response";
import { listApiWorkspaces } from "@/lib/api/resolve-workspace";

export const dynamic = "force-dynamic";

/**
 * Lista workspaces acessíveis pelo usuário do token.
 * Use o `slug` (ex.: cleartech) em POST /projects via workspaceSlug ou workspace.
 */
export const GET = withApi(
  { requireScope: "projects:read" },
  async ({ auth }) => {
    const workspaces = await listApiWorkspaces(auth.userId);
    return apiOk({
      data: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        description: w.description,
        projectCount: w._count.projects,
        isTokenDefault: w.id === auth.workspaceId,
      })),
      defaultWorkspaceId: auth.workspaceId,
    });
  },
);
