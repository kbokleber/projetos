"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/features/auth/actions";
import { switchWorkspaceAction } from "@/features/workspaces/actions";
import { APP_NAME } from "@/lib/constants";
import { ChevronDown, Plus } from "lucide-react";

type WorkspaceOption = { id: string; name: string; slug: string };

export function TopBar({
  userName,
  userEmail,
  userRole,
  workspaces,
  activeWorkspaceId,
  activeWorkspaceName,
}: {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userRole: string | null | undefined;
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fallbackId = workspaces[0]?.id ?? "";
  const [workspaceId, setWorkspaceId] = useState(
    activeWorkspaceId ?? fallbackId,
  );

  useEffect(() => {
    setWorkspaceId(activeWorkspaceId ?? fallbackId);
  }, [activeWorkspaceId, fallbackId]);

  function switchTo(next: string) {
    const prev = workspaceId;
    if (!next || next === prev) return;
    setWorkspaceId(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("workspaceId", next);
      try {
        const result = await switchWorkspaceAction(fd);
        if (!result?.ok) {
          setWorkspaceId(prev);
          return;
        }
        router.refresh();
      } catch {
        setWorkspaceId(prev);
      }
    });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b-2 border-primary bg-topbar px-4 text-topbar-foreground md:px-6">
      <Link
        href="/dashboard"
        className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
      >
        <span className="flex size-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          S
        </span>
        <span className="hidden sm:inline">
          ServiceIT{" "}
          <span className="font-normal text-topbar-foreground/70">
            · {APP_NAME}
          </span>
        </span>
      </Link>

      <p className="hidden min-w-0 flex-1 truncate text-center text-sm text-topbar-foreground/75 lg:block">
        Gestão de projetos e tarefas
      </p>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <span className="max-w-[140px] truncate font-medium">
            {userName ?? userEmail ?? "Usuário"}
          </span>
          {userRole && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              {userRole}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || workspaces.length === 0}
              className="border-topbar-foreground/30 bg-transparent text-topbar-foreground hover:bg-topbar-foreground/10 hover:text-topbar-foreground"
            >
              Trocar
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
              {activeWorkspaceName ?? "Workspace"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((w) => (
              <DropdownMenuItem
                key={w.id}
                onSelect={() => switchTo(w.id)}
                className={w.id === workspaceId ? "font-medium" : undefined}
              >
                {w.name}
              </DropdownMenuItem>
            ))}
            {workspaces.length === 0 && (
              <DropdownMenuItem disabled>Nenhum workspace</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-topbar-foreground hover:bg-topbar-foreground/10 hover:text-topbar-foreground sm:hidden"
            >
              Conta
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="truncate font-medium">{userName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/account">Alterar senha</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
              >
                Sair
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        <form action={logoutAction} className="hidden sm:block">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-topbar-foreground/80 hover:bg-topbar-foreground/10 hover:text-topbar-foreground"
          >
            Sair
          </Button>
        </form>

        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/projects/new">
            <Plus className="size-3.5" />
            Novo projeto
          </Link>
        </Button>
      </div>
    </header>
  );
}
