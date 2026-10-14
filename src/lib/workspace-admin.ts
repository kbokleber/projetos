/**
 * Permissões de administração do workspace (OWNER / ADMIN).
 * Integrações (API, Webhooks, IA) ficam restritas a esses papéis.
 */

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { WorkspaceRole } from "@/generated/prisma/client";

export function isWorkspaceAdmin(role: WorkspaceRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export async function getWorkspaceMemberRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export async function assertWorkspaceAdmin(
  userId: string,
  workspaceId: string,
) {
  const role = await getWorkspaceMemberRole(userId, workspaceId);
  if (!isWorkspaceAdmin(role)) {
    throw new AppError(
      "FORBIDDEN",
      "Apenas OWNER ou ADMIN do workspace pode gerenciar integrações.",
      403,
    );
  }
  return role;
}
