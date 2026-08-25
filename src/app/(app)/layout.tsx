import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { authService } from "@/services/auth";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

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
  try {
    workspaces = await authService.getActiveWorkspaces(session.user.id);
  } catch (err) {
    // Sessão JWT com userId antigo (ex.: após reset do banco)
    if (err instanceof AppError && err.code === "UNAUTHORIZED") {
      await signOut({ redirectTo: "/login?session=expired" });
    }
    throw err;
  }
  const activeWorkspace = workspaces[0];

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
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
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link
          href="/dashboard"
          className="flex h-14 items-center border-b border-sidebar-border px-4 text-base font-semibold tracking-tight"
        >
          Projetos
        </Link>
        <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
          {navItem("/dashboard", "Dashboard")}
          {navItem("/projects", "Projetos")}
          {navItem("/my-tasks", "Minhas tarefas")}
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Integrações
          </p>
          {navItem("/settings/api", "Tokens de API")}
          {navItem("/settings/webhooks", "Webhooks")}
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Administração
          </p>
          {navItem("/settings/users", "Usuários")}
        </nav>
        <div className="border-t border-sidebar-border p-3 text-xs">
          <p className="font-medium text-foreground">Workspace</p>
          <p className="text-muted-foreground">
            {activeWorkspace?.name ?? "—"}
          </p>
          {workspaces.length > 1 && (
            <p className="mt-1 text-muted-foreground">
              +{workspaces.length - 1} outro(s)
            </p>
          )}
        </div>
        <form action={logoutAction} className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate text-xs">
            <p className="font-medium text-foreground">{session.user.name}</p>
            <p className="truncate text-muted-foreground">{session.user.email}</p>
          </div>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sair
          </Button>
        </form>
      </aside>

      <div className="flex flex-1 flex-col">
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
