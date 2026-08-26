"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createApiTokenAction,
  type CreateTokenResult,
} from "@/features/api-tokens/actions";
import { API_SCOPES } from "@/lib/constants";

const SCOPE_LABELS: Record<string, string> = {
  "projects:read": "Projetos · leitura",
  "projects:write": "Projetos · escrita",
  "tasks:read": "Tarefas · leitura",
  "tasks:write": "Tarefas · escrita (criar/editar/mover)",
  "comments:read": "Comentários · leitura",
  "comments:write": "Comentários · escrita",
  "members:read": "Membros · leitura",
  "webhooks:read": "Webhooks · leitura",
  "webhooks:write": "Webhooks · escrita",
};

/** Escopos recomendados para IAs (inclui PATCH de tarefas). */
const AI_DEFAULT_SCOPES = new Set([
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "comments:read",
  "comments:write",
]);

export function CreateTokenForm() {
  const [state, action, pending] = useActionState<
    CreateTokenResult | undefined,
    FormData
  >(createApiTokenAction, undefined);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(AI_DEFAULT_SCOPES),
  );

  function toggle(scope: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  function selectAiScopes() {
    setSelected(new Set(AI_DEFAULT_SCOPES));
  }

  function selectAll() {
    setSelected(new Set(API_SCOPES));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">Novo token</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Para a IA editar tarefas (PATCH), o token precisa incluir{" "}
        <code className="font-mono">tasks:write</code>. Os escopos recomendados
        para IA já vêm marcados.
      </p>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm">
            Nome do token
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: IA Assistente"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm">Escopos</legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAiScopes}
                className="text-xs text-primary hover:underline"
              >
                Recomendado IA
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                Todos
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_SCOPES.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="scopes"
                  value={s}
                  checked={selected.has(s)}
                  onChange={() => toggle(s)}
                />
                <span>{SCOPE_LABELS[s] ?? s}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiresInDays" className="text-sm">
            Expiração (dias) — opcional
          </label>
          <input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            max={365}
            placeholder="Nunca expira se vazio"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {state && !state.ok && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Gerando..." : "Gerar token"}
        </Button>
      </form>

      {state?.ok && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-foreground">
            Copie e guarde este token agora — ele não será mostrado novamente.
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 font-mono text-xs">
            {state.token}
          </pre>
        </div>
      )}
    </section>
  );
}
