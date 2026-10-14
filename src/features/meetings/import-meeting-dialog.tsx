"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, X } from "lucide-react";
import { importMeetingDraftAction } from "@/features/meetings/actions";
import type { MeetingImportDraft } from "@/services/meeting-import";

export function ImportMeetingDialog({
  projectId,
  open,
  onClose,
  onImported,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onImported: (draft: MeetingImportDraft) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-meeting-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2
              id="import-meeting-title"
              className="text-sm font-semibold tracking-tight"
            >
              Importar de texto
            </h2>
            <p className="text-xs text-muted-foreground">
              Cole a transcrição ou as notas da reunião. A IA preenche o
              formulário para você revisar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={pending}
            rows={14}
            placeholder="Cole aqui a transcrição, o resumo do Granola/Teams/Meet, ou as notas da reunião…"
            className="min-h-[220px] w-full flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <p className="text-[11px] text-muted-foreground">
            {text.trim().length.toLocaleString("pt-BR")} caracteres
            {text.trim().length > 0 && text.trim().length < 40
              ? " · mínimo 40"
              : ""}
          </p>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending || text.trim().length < 40}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await importMeetingDraftAction(projectId, text);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                onImported(res.draft);
                setText("");
                onClose();
              });
            }}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileUp className="size-3.5" />
            )}
            {pending ? "Extraindo…" : "Extrair e preencher"}
          </Button>
        </div>
      </div>
    </div>
  );
}
