"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Download, Trash2, Upload, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteTaskAttachmentAction,
  uploadTaskAttachmentAction,
  type AttachmentActionState,
} from "@/features/tasks/attachment-actions";
import { dateTimeBR } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  user: { id: string; name: string | null; email: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({
  taskId,
  canEdit,
  attachments,
  variant = "default",
}: {
  taskId: string;
  canEdit: boolean;
  attachments: AttachmentItem[];
  variant?: "default" | "teams";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boundUpload = uploadTaskAttachmentAction.bind(null, taskId);
  const [state, action, pending] = useActionState<
    AttachmentActionState,
    FormData
  >(boundUpload, undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AttachmentItem | null>(null);
  const teams = variant === "teams";

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [state, router]);

  return (
    <section
      className={cn(
        "rounded-xl border bg-card/80 p-4 shadow-sm",
        teams ? "border-border/80" : "border-border bg-card",
      )}
    >
      <h2
        className={cn(
          "mb-3 flex flex-wrap items-center gap-2",
          teams
            ? "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            : "text-sm font-medium",
        )}
      >
        <Paperclip className="size-3.5" />
        Anexos
        <span className="font-normal normal-case tracking-normal text-muted-foreground">
          ({attachments.length})
        </span>
        {!canEdit && (
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
            · somente leitura
          </span>
        )}
      </h2>

      {canEdit && (
        <form
          action={action}
          className={cn(
            "mb-3 flex flex-wrap items-center gap-2",
            teams && "rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5",
          )}
        >
          <input
            ref={inputRef}
            id="attachment-file"
            name="file"
            type="file"
            required
            disabled={pending}
            className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            <Upload className="size-3.5" />
            {pending ? "Enviando…" : "Anexar"}
          </Button>
          {state && !state.ok && (
            <p className="w-full text-xs text-destructive">{state.error}</p>
          )}
        </form>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
      ) : (
        <ul
          className={cn(
            "gap-2",
            teams ? "grid sm:grid-cols-2" : "flex flex-col",
          )}
        >
          {attachments.map((a) => (
            <li
              key={a.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-border/70 bg-background px-2.5 py-2",
                teams && "hover:border-primary/30 hover:bg-accent/20",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium hover:text-primary hover:underline"
                >
                  {a.fileName}
                </a>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatSize(a.size)} · {dateTimeBR(a.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <Button asChild type="button" variant="ghost" size="sm">
                  <a
                    href={`/api/attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir / baixar"
                  >
                    <Download className="size-3.5" />
                  </a>
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleting}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover"
                    onClick={() => setDeleteTarget(a)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(next) => {
          if (!next && deleting) return;
          if (!next) setDeleteTarget(null);
        }}
        title="Remover anexo?"
        description={
          deleteTarget ? (
            <>
              Remover o anexo <strong>{deleteTarget.fileName}</strong>?
            </>
          ) : undefined
        }
        confirmLabel="Sim, remover"
        pending={deleting}
        pendingLabel="Removendo…"
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          startDelete(async () => {
            await deleteTaskAttachmentAction(id);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      />
    </section>
  );
}
