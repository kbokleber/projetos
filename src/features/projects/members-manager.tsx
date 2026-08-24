"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  addProjectMemberAction,
  changeProjectMemberRoleAction,
  removeProjectMemberAction,
} from "@/features/projects/actions";
import { PROJECT_ROLES } from "@/lib/constants";
import { UserMinus, UserPlus } from "lucide-react";

type Member = {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export function MembersManager({
  projectId,
  members,
  canManage,
  currentUserId,
}: {
  projectId: string;
  members: Member[];
  canManage: boolean;
  currentUserId: string;
}) {
  const boundAdd = addProjectMemberAction.bind(null, projectId);
  const [addState, addAction, adding] = useActionState<
    { ok: boolean; error?: string } | undefined,
    FormData
  >(boundAdd, undefined);

  const [removing, startRemove] = useTransition();
  const [changing, startChange] = useTransition();

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Membros</h2>
        <span className="text-xs text-muted-foreground">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </header>

      {canManage && (
        <form
          action={addAction}
          className="mb-4 grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="email@empresa.com"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            name="role"
            defaultValue="MEMBER"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PROJECT_ROLES.filter((r) => r !== "OWNER").map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={adding}>
            <UserPlus className="size-4" />
            {adding ? "Convidando..." : "Adicionar"}
          </Button>
          {addState && !addState.ok && (
            <p className="sm:col-span-3 text-xs text-destructive">
              {addState.error}
            </p>
          )}
        </form>
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
                <Avatar name={m.name} avatarUrl={m.avatarUrl} />
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
                      onClick={() =>
                        startRemove(async () => {
                          if (
                            !confirm(
                              `Remover ${m.name ?? m.email} do projeto?`,
                            )
                          )
                            return;
                          await removeProjectMemberAction(projectId, m.userId);
                        })
                      }
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
    </section>
  );
}

function Avatar({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const initials = (name ?? "?").slice(0, 1).toUpperCase();
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="size-8 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {initials}
    </span>
  );
}
