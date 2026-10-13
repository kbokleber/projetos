"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UserPlus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssigneeMember = {
  userId: string;
  name: string | null;
  email: string;
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

function Avatar({
  member,
  size = "md",
  className,
}: {
  member: AssigneeMember;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-8 text-xs" : "size-7 text-[11px]";
  return (
    <span
      title={member.name ?? member.email}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeClass,
        avatarColor(member.userId),
        className,
      )}
    >
      {initials(member.name, member.email)}
    </span>
  );
}

export function TaskAssigneePicker({
  formId,
  members,
  currentAssigneeIds,
  currentUserId,
  disabled,
}: {
  formId: string;
  members: AssigneeMember[];
  currentAssigneeIds: string[];
  currentUserId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(currentAssigneeIds);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(currentAssigneeIds);
  }, [currentAssigneeIds]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const byId = useMemo(() => {
    const map = new Map(members.map((m) => [m.userId, m]));
    return map;
  }, [members]);

  const assigned = selected
    .map((id) => byId.get(id))
    .filter((m): m is AssigneeMember => !!m);

  const q = query.trim().toLowerCase();
  const suggestions = members.filter((m) => {
    if (selected.includes(m.userId)) return false;
    if (!q) return true;
    const label = `${m.name ?? ""} ${m.email}`.toLowerCase();
    return label.includes(q);
  });

  function add(userId: string) {
    setSelected((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setQuery("");
  }

  function remove(userId: string) {
    setSelected((prev) => prev.filter((id) => id !== userId));
  }

  return (
    <div ref={rootRef} className="relative px-1">
      {/* valores enviados no salvar */}
      {selected.map((id) => (
        <input
          key={id}
          form={formId}
          type="hidden"
          name="assigneeIds"
          value={id}
        />
      ))}

      <div className="flex flex-wrap items-center gap-1">
        {!disabled && (
          <button
            type="button"
            title="Adicionar pessoa"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            <UserPlus className="size-3.5" />
          </button>
        )}

        {assigned.length === 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-default"
          >
            Não atribuído
          </button>
        ) : (
          <div className="flex items-center -space-x-1.5">
            {assigned.slice(0, 5).map((m) => (
              <Avatar key={m.userId} member={m} className="ring-2 ring-card" />
            ))}
            {assigned.length > 5 && (
              <span className="z-[1] inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                +{assigned.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 w-[min(100%,18rem)] rounded-xl border border-border bg-popover p-2 shadow-lg sm:w-72">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite um nome ou um email"
              className="h-9 w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {assigned.length > 0 && (
            <div className="mb-2">
              <p className="px-1.5 pb-1 text-[11px] font-semibold text-muted-foreground">
                Atribuídas
              </p>
              <ul className="max-h-36 overflow-y-auto">
                {assigned.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/60"
                  >
                    <Avatar member={m} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {m.name ?? m.email}
                      {m.userId === currentUserId ? " (você)" : ""}
                    </span>
                    <button
                      type="button"
                      title="Remover"
                      onClick={() => remove(m.userId)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="px-1.5 pb-1 text-[11px] font-semibold text-muted-foreground">
              Sugestões
            </p>
            {suggestions.length === 0 ? (
              <p className="px-1.5 py-2 text-xs text-muted-foreground">
                {q ? "Ninguém encontrado." : "Todos já estão atribuídos."}
              </p>
            ) : (
              <ul className="max-h-44 overflow-y-auto">
                {suggestions.map((m) => (
                  <li key={m.userId}>
                    <button
                      type="button"
                      onClick={() => add(m.userId)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-muted/60"
                    >
                      <Avatar member={m} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {m.name ?? m.email}
                        {m.userId === currentUserId ? " (você)" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-2 border-t border-border/60 px-1.5 pt-2 text-[10px] text-muted-foreground">
            Clique em Salvar para confirmar as atribuições.
          </p>
        </div>
      )}
    </div>
  );
}
