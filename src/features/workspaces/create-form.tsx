"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createWorkspaceAction,
  type WorkspaceFormState,
} from "./actions";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    WorkspaceFormState,
    FormData
  >(createWorkspaceAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  if (state?.ok) {
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        Workspace criado. Ele já está ativo no menu.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {state && !state.ok && state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Field
        id="name"
        label="Nome"
        required
        error={state && !state.ok ? state.fieldErrors?.name : undefined}
        placeholder="Ex.: Equipe Comercial"
      />
      <Field
        id="slug"
        label="Identificador (slug)"
        error={state && !state.ok ? state.fieldErrors?.slug : undefined}
        placeholder="opcional — gerado a partir do nome"
        hint="Apenas letras minúsculas, números e hífen"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="min-h-[64px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="Opcional"
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Criando…" : "Criar workspace"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  ...props
}: React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
