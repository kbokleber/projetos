"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createWebhookAction } from "@/features/webhooks/actions";

const EVENTS = [
  "project.created",
  "project.updated",
  "task.created",
  "task.updated",
  "task.moved",
  "task.completed",
  "task.deleted",
  "comment.created",
];

export function CreateWebhookForm() {
  const [state, action, pending] = useActionState<
    { ok: boolean; error?: string; secret?: string } | undefined,
    FormData
  >(createWebhookAction, undefined);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">Novo webhook</h2>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm">
              Nome
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="url" className="text-sm">
              URL do endpoint
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://exemplo.com/webhooks/sistema-projetos"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">Eventos</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EVENTS.map((e) => (
              <label
                key={e}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <input type="checkbox" name="events" value={e} />
                <code className="font-mono text-xs">{e}</code>
              </label>
            ))}
          </div>
        </fieldset>

        {state && !state.ok && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Criando..." : "Criar webhook"}
        </Button>
      </form>

      {state?.ok && state.secret && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-foreground">
            Guarde este segredo — ele não será mostrado novamente.
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 font-mono text-xs">
            {state.secret}
          </pre>
        </div>
      )}
    </section>
  );
}
