"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  type WorkspaceFormState,
} from "./actions";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export function WorkspaceMembersPanel({
  workspaceId,
  members,
  canManage,
  currentUserId,
}: {
  workspaceId: string;
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{m.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.user.email}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{m.role}</span>
              {canManage &&
                m.role !== "OWNER" &&
                m.user.id !== currentUserId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveTarget(m)}
                  >
                    Remover
                  </Button>
                )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && <AddMemberForm workspaceId={workspaceId} />}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(next) => {
          if (!next && pending) return;
          if (!next) setRemoveTarget(null);
        }}
        title="Remover membro do workspace?"
        description={
          removeTarget ? (
            <>
              Remover <strong>{removeTarget.user.name}</strong> (
              {removeTarget.user.email}) deste workspace?
            </>
          ) : undefined
        }
        confirmLabel="Sim, remover"
        pending={pending}
        pendingLabel="Removendo…"
        onConfirm={() => {
          if (!removeTarget) return;
          const fd = new FormData();
          fd.set("workspaceId", workspaceId);
          fd.set("memberId", removeTarget.id);
          startTransition(async () => {
            await removeWorkspaceMemberAction(fd);
            setRemoveTarget(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    WorkspaceFormState,
    FormData
  >(addWorkspaceMemberAction, undefined);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {state && !state.ok && state.error && (
        <p className="w-full text-sm text-destructive sm:order-last sm:basis-full">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="w-full text-sm text-emerald-700 dark:text-emerald-400 sm:order-last sm:basis-full">
          Usuário adicionado ao workspace.
        </p>
      )}
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Convidar por e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="usuario@empresa.com"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role" className="text-sm font-medium">
          Papel
        </label>
        <select
          id="role"
          name="role"
          defaultValue="MEMBER"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adicionando…" : "Adicionar"}
      </Button>
    </form>
  );
}
