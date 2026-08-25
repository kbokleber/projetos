"use client";

import { switchWorkspaceAction } from "./actions";

type WorkspaceOption = { id: string; name: string; slug: string };

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string | null;
}) {
  if (workspaces.length === 0) {
    return <p className="text-muted-foreground">—</p>;
  }

  if (workspaces.length === 1) {
    return (
      <p className="truncate text-muted-foreground">{workspaces[0].name}</p>
    );
  }

  return (
    <form action={switchWorkspaceAction}>
      <label htmlFor="workspace-switcher" className="sr-only">
        Workspace ativo
      </label>
      <select
        id="workspace-switcher"
        name="workspaceId"
        defaultValue={activeId ?? workspaces[0]?.id}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-1 w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs text-sidebar-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </form>
  );
}
