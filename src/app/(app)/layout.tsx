import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { AppError } from "@/lib/errors";
import {
  getWorkspaceMemberRole,
  isWorkspaceAdmin,
} from "@/lib/workspace-admin";
import { TopBar } from "@/components/app-shell/top-bar";
import { SideNav } from "@/components/app-shell/side-nav";
import { dashboardService } from "@/services/dashboard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  let workspaces;
  let activeWorkspace;
  try {
    const resolved = await resolveActiveWorkspace(session.user.id);
    workspaces = resolved.workspaces;
    activeWorkspace = resolved.active;
  } catch (err) {
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      redirect("/api/session/reset");
    }
    throw err;
  }

  const workspaceRole = activeWorkspace
    ? await getWorkspaceMemberRole(session.user.id, activeWorkspace.id)
    : null;
  const canManageWorkspace = isWorkspaceAdmin(workspaceRole);
  const canSeeUsers = session.user.role === "ADMIN";

  const overview = activeWorkspace
    ? await dashboardService
        .summary(activeWorkspace.id, session.user.id)
        .then((s) => ({
          projectsActive: s.projectsActive,
          tasksOpen: s.tasksOpen,
          tasksOverdue: s.tasksOverdue,
        }))
        .catch(() => null)
    : null;

  return (
    <div className="flex min-h-svh w-full flex-col bg-background">
      <TopBar
        userName={session.user.name}
        userEmail={session.user.email}
        userRole={session.user.role}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspace?.id ?? null}
        activeWorkspaceName={activeWorkspace?.name ?? null}
      />

      <div className="flex min-h-0 flex-1">
        <SideNav
          canManageWorkspace={canManageWorkspace}
          canSeeUsers={canSeeUsers}
          overview={overview}
        />

        <main className="min-w-0 flex-1 overflow-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
