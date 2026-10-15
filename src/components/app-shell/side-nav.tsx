"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  KeyRound,
  Webhook,
  Sparkles,
  Users,
  Building2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OverviewBox } from "@/components/app-shell/overview-box";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Evita que rotas curtas “roubem” o ativo de irmãs mais específicas
  return true;
}

export function SideNav({
  canManageWorkspace,
  canSeeUsers,
  overview,
}: {
  canManageWorkspace: boolean;
  canSeeUsers: boolean;
  overview: {
    projectsActive: number;
    tasksOpen: number;
    tasksOverdue: number;
  } | null;
}) {
  const pathname = usePathname() ?? "";

  const sections: NavSection[] = [
    {
      title: "Trabalho",
      items: [
        { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
        { href: "/projects", label: "Projetos", Icon: FolderKanban },
        { href: "/my-tasks", label: "Minhas tarefas", Icon: ListTodo },
      ],
    },
  ];

  if (canManageWorkspace) {
    sections.push({
      title: "Integrações",
      items: [
        { href: "/settings/api", label: "Tokens de API", Icon: KeyRound },
        { href: "/settings/webhooks", label: "Webhooks", Icon: Webhook },
        { href: "/settings/ai", label: "IA / OpenAI", Icon: Sparkles },
      ],
    });
  }

  const adminItems: NavItem[] = [];
  if (canSeeUsers) {
    adminItems.push({
      href: "/settings/users",
      label: "Usuários",
      Icon: Users,
    });
  }
  if (canManageWorkspace) {
    adminItems.push({
      href: "/settings/workspaces",
      label: "Workspaces",
      Icon: Building2,
    });
  }
  if (adminItems.length > 0) {
    sections.push({ title: "Administração", items: adminItems });
  }

  sections.push({
    title: "Configurações",
    items: [
      { href: "/settings/account", label: "Conta", Icon: UserRound },
    ],
  });

  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const activeHref =
    allHrefs
      .filter((href) => isNavActive(pathname, href))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-4 text-sm">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, Icon }) => {
                const active = activeHref === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "relative flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted/70",
                        active &&
                          "bg-nav-active font-medium text-foreground before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-nav-rail",
                      )}
                    >
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {overview && (
        <OverviewBox
          projectsActive={overview.projectsActive}
          tasksOpen={overview.tasksOpen}
          tasksOverdue={overview.tasksOverdue}
        />
      )}
    </aside>
  );
}
