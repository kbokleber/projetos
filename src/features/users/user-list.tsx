import { prisma } from "@/lib/prisma";
import { dateBR } from "@/lib/format-date";
import { adminToggleUserActiveAction } from "./actions";
import { RoleSelect } from "./role-select";
import { CheckCircle2, XCircle } from "lucide-react";

export async function UserList({ currentUserId }: { currentUserId: string }) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      workspaceMembers: { select: { workspaceId: true } },
    },
  });

  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        Nenhum usuário cadastrado.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">E-mail</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Workspaces</th>
            <th className="px-3 py-2 font-medium">Criado em</th>
            <th className="px-3 py-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-accent/20">
              <td className="px-3 py-2 font-medium">
                {u.name}
                {u.id === currentUserId && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (você)
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
              <td className="px-3 py-2">
                <RoleSelect
                  userId={u.id}
                  currentRole={u.role as "ADMIN" | "USER"}
                  isSelf={u.id === currentUserId}
                />
              </td>
              <td className="px-3 py-2">
                {u.active ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" />
                    Ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <XCircle className="size-3.5" />
                    Inativo
                  </span>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {u.workspaceMembers.length}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {dateBR(u.createdAt)}
              </td>
              <td className="px-3 py-2 text-right">
                {u.id !== currentUserId && (
                  <form action={adminToggleUserActiveAction} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <button
                      type="submit"
                      className="text-xs text-primary hover:underline"
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
