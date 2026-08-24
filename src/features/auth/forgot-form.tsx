"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { forgotPasswordAction, type ActionResult } from "@/features/auth/actions";

type State = ActionResult & { devToken?: string; devEmail?: string };

export function ForgotForm() {
  const [state, action, pending] = useActionState<State | undefined, FormData>(
    forgotPasswordAction as unknown as (
      prev: State | undefined,
      form: FormData,
    ) => Promise<State>,
    undefined,
  );

  const fieldErrors =
    state && !state.ok ? state.fieldErrors ?? {} : ({} as Record<string, string>);

  if (state?.ok && state.devToken) {
    const link = `/reset-password?token=${encodeURIComponent(state.devToken)}`;
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-muted p-4 text-sm">
        <p className="font-medium">Link gerado (modo desenvolvimento)</p>
        <p className="text-muted-foreground">
          Em produção este link é enviado por e-mail. Em dev, use o link
          abaixo (válido por 60 minutos):
        </p>
        <a className="break-all text-primary underline" href={link}>
          {link}
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {fieldErrors.email && (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        )}
      </div>

      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
