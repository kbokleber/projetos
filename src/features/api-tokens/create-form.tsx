"use client";

import { useActionState } from "react";
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
  "tasks:write": "Tarefas · escrita",
  "comments:read": "Comentários · leitura",
  "comments:write": "Comentários · escrita",
  "members:read": "Membros · leitura",
  "webhooks:read": "Webhooks · leitura",
  "webhooks:write": "Webhooks · escrita",
};

export function CreateTokenForm() {
  const [state, action, pending] = useActionState<
    CreateTokenResult | undefined,
    FormData
  >(createApiTokenAction, undefined);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">Novo token</h2>
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
            placeholder="Ex.: GLPI Produção"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">Escopos</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {API_SCOPES.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <input type="checkbox" name="scopes" value={s} />
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
