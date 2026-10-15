"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addProjectMemberAction,
  changeProjectMemberRoleAction,
  removeProjectMemberAction,
} from "@/features/projects/actions";
import { PROJECT_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Search, UserMinus, UserPlus } from "lucide-react";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

type Candidate = {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-rose-400",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

function initials(name: string | null | undefined, email: string) {
  const base = (name ?? email).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return base.slice(0, 1).toUpperCase();
}

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0]!;
}

function MemberAvatar({
  userId,
  name,
  email,
  avatarUrl,
  size = "md",
}: {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-8 text-xs";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={cn(sizeClass, "rounded-full object-cover")}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeClass,
        avatarColor(userId),
      )}
    >
      {initials(name, email)}
    </span>
  );
}

export function MembersManager({
  projectId,
  members,
  candidates,
  canManage,
  currentUserId,
}: {
  projectId: string;
  members: Member[];
  candidates: Candidate[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const [removing, startRemove] = useTransition();
  const [changing, startChange] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.userId)),
    [members],
  );

  const q = query.trim().toLowerCase();
  const suggestions = candidates.filter((c) => {
    if (memberIds.has(c.userId)) return false;
    if (!q) return true;
    const label = `${c.name ?? ""} ${c.email}`.toLowerCase();
    return label.includes(q);
  });

  function addCandidate(userId: string) {
    setAddError(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    startAdd(async () => {
      const result = await addProjectMemberAction(projectId, undefined, fd);
      if (result && !result.ok) {
        setAddError(result.error ?? "Não foi possível adicionar.");
        return;
      }
      setQuery("");
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Membros</h2>
        <span className="text-xs text-muted-foreground">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </header>

      {canManage && (
        <div className="mb-4 rounded-xl border border-border bg-background p-3 shadow-sm">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite um nome ou um email"
                className="h-9 w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "ADMIN" | "MEMBER" | "VIEWER")
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PROJECT_ROLES.filter((r) => r !== "OWNER").map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {members.length > 0 && (
            <div className="mb-3">
              <p className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground">
                No projeto
              </p>
              <ul className="flex max-h-36 flex-col gap-0.5 overflow-y-auto">
                {members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1.5"
                  >
                    <MemberAvatar
                      userId={m.userId}
                      name={m.name}
                      email={m.email}
                      avatarUrl={m.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {m.name ?? m.email}
                      {m.userId === currentUserId ? " (você)" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="px-1 pb-1 text-[11px] font-semibold text-muted-foreground">
              Sugestões
            </p>
            {suggestions.length === 0 ? (
              <p className="px-1.5 py-2 text-xs text-muted-foreground">
                {q
                  ? "Ninguém encontrado entre os membros cadastrados."
                  : candidates.length === 0
                    ? "Não há outros membros no workspace."
                    : "Todos os membros do workspace já estão no projeto."}
              </p>
            ) : (
              <ul className="max-h-52 overflow-y-auto">
                {suggestions.map((c) => (
                  <li key={c.userId}>
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => addCandidate(c.userId)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted/60 disabled:opacity-60"
                    >
                      <MemberAvatar
                        userId={c.userId}
                        name={c.name}
                        email={c.email}
                        avatarUrl={c.avatarUrl}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {c.name ?? c.email}
                        {c.userId === currentUserId ? " (você)" : ""}
                      </span>
                      <UserPlus className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-2 border-t border-border/60 px-1 pt-2 text-[10px] text-muted-foreground">
            Só aparecem membros já cadastrados no workspace. Clique para
            adicionar com o papel selecionado.
          </p>
          {addError && (
            <p className="mt-2 text-xs text-destructive">{addError}</p>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const isMe = m.userId === currentUserId;
          return (
            <li
              key={m.userId}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar
                  userId={m.userId}
                  name={m.name}
                  email={m.email}
                  avatarUrl={m.avatarUrl}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {m.name ?? m.email}{" "}
                    {isMe && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage ? (
                  <>
                    <select
                      defaultValue={m.role}
                      disabled={changing}
                      onChange={(ev) =>
                        startChange(async () => {
                          await changeProjectMemberRoleAction(
                            projectId,
                            m.userId,
                            ev.target.value as "ADMIN" | "MEMBER" | "VIEWER",
                          );
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {PROJECT_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={removing || m.role === "OWNER"}
                      title={
                        m.role === "OWNER"
                          ? "Não é possível remover o único OWNER"
                          : "Remover"
                      }
                      onClick={() => setRemoveTarget(m)}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </>
                ) : (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {m.role}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(next) => {
          if (!next && removing) return;
          if (!next) setRemoveTarget(null);
        }}
        title="Remover membro do projeto?"
        description={
          removeTarget ? (
            <>
              Remover{" "}
              <strong>{removeTarget.name ?? removeTarget.email}</strong> do
              projeto?
            </>
          ) : undefined
        }
        confirmLabel="Sim, remover"
        pending={removing}
        pendingLabel="Removendo…"
        onConfirm={() => {
          if (!removeTarget) return;
          const target = removeTarget;
          startRemove(async () => {
            await removeProjectMemberAction(projectId, target.userId);
            setRemoveTarget(null);
          });
        }}
      />
    </section>
  );
}
