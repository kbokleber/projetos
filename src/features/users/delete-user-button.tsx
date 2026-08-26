"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteUserAction } from "./actions";

export function DeleteUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const ok = confirm(
      `Excluir o usuário "${userName}"?\n\n` +
        "Ele será removido do sistema. Projetos e tarefas que ele criou permanecerão, atribuídos a você como criador. Esta ação não pode ser desfeita.",
    );
    if (!ok) return;

    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      const result = await adminDeleteUserAction(fd);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Excluindo…" : "Excluir"}
    </button>
  );
}
