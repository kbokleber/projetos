import { cookies } from "next/headers";
import { authService } from "@/services/auth";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Resolve o workspace ativo do usuário (cookie, senão o mais antigo).
 */
export async function resolveActiveWorkspace(userId: string): Promise<{
  workspaces: WorkspaceSummary[];
  active: WorkspaceSummary | null;
}> {
  const workspaces = await authService.getActiveWorkspaces(userId);
  if (workspaces.length === 0) {
    return { workspaces: [], active: null };
  }

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const active =
    workspaces.find((w) => w.id === preferred) ?? workspaces[0] ?? null;

  return { workspaces, active };
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
