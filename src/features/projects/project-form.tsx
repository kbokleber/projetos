"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUSES } from "@/lib/constants";
import {
  createProjectAction,
  updateProjectAction,
  type FormState,
} from "@/features/projects/actions";
import { Save, Trash2 } from "lucide-react";

const COLOR_CHOICES = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#64748b", // slate
] as const;

export type ProjectFormProps = {
  mode: "create" | "edit";
  projectId?: string;
  initialValues?: {
    workspaceId: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    status: string;
    startDate: string | null;
    dueDate: string | null;
  };
  workspaces: Array<{ id: string; name: string }>;
  onArchive?: () => void | Promise<void>;
  archiveLabel?: string;
};

export function ProjectForm(props: ProjectFormProps) {
  const router = useRouter();
  const initial = props.initialValues;
  const [color, setColor] = useState<string | null>(initial?.color ?? null);

  const bound =
    props.mode === "create"
      ? createProjectAction
      : updateProjectAction.bind(null, props.projectId!);

  const [state, formAction, pending] = useActionState<
    FormState,
    FormData
  >(bound, undefined);

  if (state?.ok && typeof window !== "undefined") {
    // evita refresh em loop: navega via useEffect-like via router
    setTimeout(() => {
      router.push(
        props.mode === "create" ? `/projects/${state.projectId}` : `/projects/${state.projectId}`,
      );
    }, 0);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state && !state.ok && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Field
        label="Nome"
        name="name"
        required
        defaultValue={initial?.name}
        error={state && !state.ok ? state.fieldErrors?.name : undefined}
      />

      <Field
        label="Workspace"
        name="workspaceId"
        as="select"
        defaultValue={initial?.workspaceId ?? props.workspaces[0]?.id}
        options={props.workspaces.map((w) => ({ value: w.id, label: w.name }))}
        disabled={props.mode === "edit"}
        error={state && !state.ok ? state.fieldErrors?.workspaceId : undefined}
      />

      <Field
        label="Descrição"
        name="description"
        as="textarea"
        rows={4}
        defaultValue={initial?.description ?? ""}
        error={
          state && !state.ok ? state.fieldErrors?.description : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Status"
          name="status"
          as="select"
          defaultValue={initial?.status ?? "ACTIVE"}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: s }))}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm">Cor</label>
          <div className="flex flex-wrap gap-2">
            <input type="hidden" name="color" value={color ?? ""} />
            {COLOR_CHOICES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Cor ${c}`}
                className={
                  "size-7 rounded-md border-2 transition-transform hover:scale-110 " +
                  (color === c ? "border-foreground" : "border-transparent")
                }
                style={{ background: c }}
              />
            ))}
            <button
              type="button"
              onClick={() => setColor(null)}
              aria-label="Sem cor"
              className={
                "flex size-7 items-center justify-center rounded-md border text-xs " +
                (color === null
                  ? "border-foreground bg-muted"
                  : "border-border text-muted-foreground hover:bg-muted")
              }
            >
              —
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Início"
          name="startDate"
          type="date"
          defaultValue={
            initial?.startDate
              ? new Date(initial.startDate).toISOString().slice(0, 10)
              : ""
          }
        />
        <Field
          label="Prazo"
          name="dueDate"
          type="date"
          defaultValue={
            initial?.dueDate
              ? new Date(initial.dueDate).toISOString().slice(0, 10)
              : ""
          }
        />
      </div>

      <Field
        label="Ícone (opcional)"
        name="icon"
        placeholder="Ex.: rocket, target, briefcase"
        defaultValue={initial?.icon ?? ""}
        hint="Use palavras-chave curtas para identificar o projeto em listas."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending
              ? "Salvando..."
              : props.mode === "create"
                ? "Criar projeto"
                : "Salvar alterações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
          >
            Cancelar
          </Button>
        </div>
        {props.mode === "edit" && props.onArchive && (
          <form action={props.onArchive}>
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 className="size-4" />
              {props.archiveLabel ?? "Arquivar"}
            </Button>
          </form>
        )}
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  as?: "input" | "textarea" | "select";
  type?: string;
  required?: boolean;
  rows?: number;
  defaultValue?: string | number | undefined;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string | undefined;
};

function Field(p: FieldProps) {
  const id = `f-${p.name}`;
  const errorId = `${id}-err`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm">
        {p.label}
      </label>
      {p.as === "textarea" ? (
        <textarea
          id={id}
          name={p.name}
          required={p.required}
          rows={p.rows ?? 3}
          defaultValue={p.defaultValue as string | undefined}
          aria-invalid={!!p.error}
          aria-describedby={p.error ? errorId : undefined}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : p.as === "select" ? (
        <select
          id={id}
          name={p.name}
          required={p.required}
          defaultValue={p.defaultValue as string | undefined}
          disabled={p.disabled}
          aria-invalid={!!p.error}
          aria-describedby={p.error ? errorId : undefined}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {p.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={p.name}
          type={p.type ?? "text"}
          required={p.required}
          placeholder={p.placeholder}
          defaultValue={p.defaultValue as string | undefined}
          disabled={p.disabled}
          aria-invalid={!!p.error}
          aria-describedby={p.error ? errorId : undefined}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      )}
      {p.hint && !p.error && (
        <p className="text-xs text-muted-foreground">{p.hint}</p>
      )}
      {p.error && (
        <p id={errorId} className="text-xs text-destructive">
          {p.error}
        </p>
      )}
    </div>
  );
}
