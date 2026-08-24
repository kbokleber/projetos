"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, Loader2 } from "lucide-react";
import { adminChangeUserRoleAction } from "./actions";

type Role = "ADMIN" | "USER";

export function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Role;
    if (next === currentRole) return;
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", next);
    startTransition(async () => {
      try {
        await adminChangeUserRoleAction(fd);
        router.refresh();
      } catch (err) {
        // Reverte o select em caso de erro
        e.target.value = currentRole;
        alert(err instanceof Error ? err.message : "Falha ao alterar a role.");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <select
        value={currentRole}
        onChange={onChange}
        disabled={pending || (isSelf && currentRole === "ADMIN")}
        title={
          isSelf && currentRole === "ADMIN"
            ? "Você não pode rebaixar o seu próprio usuário de ADMIN."
            : undefined
        }
        className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="USER">USER</option>
        <option value="ADMIN">ADMIN</option>
      </select>
      {pending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      {!pending && currentRole === "ADMIN" ? (
        <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Shield className="size-3.5 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
