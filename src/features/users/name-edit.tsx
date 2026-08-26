"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { adminUpdateUserNameAction } from "./actions";

export function UserNameEdit({
  userId,
  name,
  isSelf,
}: {
  userId: string;
  name: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setValue(name);
    setError(null);
    setEditing(false);
  }

  function save() {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError("Informe o nome");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("name", trimmed);
    setError(null);
    startTransition(async () => {
      try {
        const result = await adminUpdateUserNameAction(fd);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setEditing(false);
        router.refresh();
      } catch {
        setError("Falha ao salvar.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-medium">{name}</span>
        {isSelf && (
          <span className="text-xs text-muted-foreground">(você)</span>
        )}
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Editar nome"
          aria-label={`Editar nome de ${name}`}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-[12rem] flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          disabled={pending}
          autoFocus
          className="h-7 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Nome do usuário"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50"
          title="Salvar"
          aria-label="Salvar nome"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-50"
          title="Cancelar"
          aria-label="Cancelar edição"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
