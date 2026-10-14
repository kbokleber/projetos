import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { AppError } from "@/lib/errors";
import {
  getWorkspaceMemberRole,
  isWorkspaceAdmin,
} from "@/lib/workspace-admin";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/features/workspaces/workspace-switcher";

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
    // Sessão JWT com userId antigo — limpa cookie via Route Handler
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      redirect("/api/session/reset");
    }
    throw err;
  }

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const workspaceRole = activeWorkspace
    ? await getWorkspaceMemberRole(session.user.id, activeWorkspace.id)
    : null;
  const canManageWorkspace = isWorkspaceAdmin(workspaceRole);
  const canSeeUsers = session.user.role === "ADMIN";
  const canSeeAdminNav = canManageWorkspace || canSeeUsers;
  const navItem = (href: string, label: string) => {
    const active =
      pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "rounded-md px-3 py-2 transition-colors hover:bg-accent hover:text-accent-foreground",
          active && "bg-accent font-medium text-accent-foreground",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-svh w-full">
      {/* Sidebar com altura da viewport: rodapé (workspace/sair) sempre visível */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link
          href="/dashboard"
          className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 text-base font-semibold tracking-tight"
        >
          Projetos
        </Link>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm">
          {navItem("/dashboard", "Dashboard")}
          {navItem("/projects", "Projetos")}
          {navItem("/my-tasks", "Minhas tarefas")}
          {canManageWorkspace ? (
            <>
              <div className="my-2 h-px bg-border" />
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Integrações
              </p>
              {navItem("/settings/api", "Tokens de API")}
              {navItem("/settings/webhooks", "Webhooks")}
              {navItem("/settings/ai", "IA / OpenAI")}
            </>
          ) : null}
          {canSeeAdminNav ? (
            <>
              <div className="my-2 h-px bg-border" />
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Administração
              </p>
              {canSeeUsers ? navItem("/settings/users", "Usuários") : null}
              {canManageWorkspace
                ? navItem("/settings/workspaces", "Workspaces")
                : null}
            </>
          ) : null}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3 text-xs">
          <p className="font-medium text-foreground">Workspace ativo</p>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspace?.id ?? null}
          />
        </div>
        <form
          action={logoutAction}
          className="shrink-0 border-t border-sidebar-border p-3"
        >
          <div className="mb-2 truncate text-xs">
            <p className="font-medium text-foreground">{session.user.name}</p>
            <p className="truncate text-muted-foreground">{session.user.email}</p>
            <Link
              href="/settings/account"
              className="mt-1 inline-block text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Alterar senha
            </Link>
          </div>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sair
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {activeWorkspace?.name ?? "Sem workspace"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/projects/new">+ Novo projeto</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
