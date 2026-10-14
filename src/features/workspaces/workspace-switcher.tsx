"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchWorkspaceAction } from "./actions";

type WorkspaceOption = { id: string; name: string; slug: string };

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fallbackId = workspaces[0]?.id ?? "";
  const [value, setValue] = useState(activeId ?? fallbackId);

  // Mantém o select alinhado ao workspace resolvido no servidor
  useEffect(() => {
    setValue(activeId ?? fallbackId);
  }, [activeId, fallbackId]);

  if (workspaces.length === 0) {
    return <p className="text-muted-foreground">—</p>;
  }

  if (workspaces.length === 1) {
    return (
      <p className="truncate text-muted-foreground">{workspaces[0].name}</p>
    );
  }

  return (
    <div>
      <label htmlFor="workspace-switcher" className="sr-only">
        Workspace ativo
      </label>
      <select
        id="workspace-switcher"
        name="workspaceId"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          if (!next || next === prev) return;
          setValue(next);
          startTransition(async () => {
            const fd = new FormData();
            fd.set("workspaceId", next);
            try {
              const result = await switchWorkspaceAction(fd);
              if (!result?.ok) {
                setValue(prev);
                return;
              }
              router.refresh();
            } catch {
              setValue(prev);
            }
          });
        }}
        className="mt-1 w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs text-sidebar-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      {pending && (
        <p className="mt-1 text-[10px] text-muted-foreground">Trocando…</p>
      )}
    </div>
  );
}
