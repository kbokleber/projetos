"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signupAction, type ActionResult } from "@/features/auth/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionResult | undefined, FormData>(
    signupAction,
    undefined,
  );

  const fieldErrors =
    state && !state.ok ? state.fieldErrors ?? {} : ({} as Record<string, string>);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field id="name" label="Seu nome" error={fieldErrors.name} autoComplete="name" required />
      <Field
        id="email"
        label="E-mail"
        type="email"
        error={fieldErrors.email}
        autoComplete="email"
        required
      />
      <Field
        id="password"
        label="Senha"
        type="password"
        error={fieldErrors.password}
        autoComplete="new-password"
        required
      />
      <Field
        id="confirmPassword"
        label="Confirmar senha"
        type="password"
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
        required
      />

      <div className="my-2 border-t border-border" />

      <Field
        id="workspaceName"
        label="Nome do workspace"
        error={fieldErrors.workspaceName}
        required
      />
      <Field
        id="workspaceSlug"
        label="Identificador (slug)"
        error={fieldErrors.workspaceSlug}
        placeholder="minha-empresa"
        hint="Opcional. Gerado a partir do nome se ficar em branco."
      />

      {state && !state.ok && !state.fieldErrors && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  error,
  hint,
  ...input
}: {
  id: string;
  label: string;
  type?: string;
  error?: string;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...input}
      />
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
