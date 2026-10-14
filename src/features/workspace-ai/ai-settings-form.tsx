"use client";

import { useActionState, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  clearWorkspaceAiSettingsAction,
  saveWorkspaceAiSettingsAction,
  type WorkspaceAiActionState,
} from "@/features/workspace-ai/actions";

type Props = {
  canEdit: boolean;
  configured: boolean;
  provider: string;
  baseUrl: string | null;
  model: string;
  apiKeyLast4: string | null;
};

export function AiSettingsForm({
  canEdit,
  configured,
  provider,
  baseUrl,
  model,
  apiKeyLast4,
}: Props) {
  const [saveState, saveAction, savePending] = useActionState<
    WorkspaceAiActionState | undefined,
    FormData
  >(saveWorkspaceAiSettingsAction, undefined);

  const [clearState, clearAction, clearPending] = useActionState<
    WorkspaceAiActionState | undefined,
    FormData
  >(clearWorkspaceAiSettingsAction, undefined);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (clearState?.ok) setConfirmClear(false);
  }, [clearState]);

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {configured ? (
          <p>
            IA configurada neste workspace
            {apiKeyLast4 ? (
              <>
                {" "}
                (<code className="font-mono text-foreground">…{apiKeyLast4}</code>
                , modelo{" "}
                <code className="font-mono text-foreground">{model}</code>)
              </>
            ) : null}
            . Peça a um OWNER ou ADMIN para alterar.
          </p>
        ) : (
          <p>
            A IA ainda não foi configurada. Peça a um OWNER ou ADMIN do
            workspace para salvar a chave em Configurações → IA.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        action={saveAction}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="grid gap-1.5">
          <label htmlFor="provider" className="text-sm font-medium">
            Provedor
          </label>
          <select
            id="provider"
            name="provider"
            defaultValue={provider || "openai"}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="openai">OpenAI</option>
            <option value="openai-compatible">
              Compatível com OpenAI (MiniMax, Azure, Ollama, etc.)
            </option>
          </select>
          <p className="text-xs text-muted-foreground">
            Qualquer API no formato OpenAI (
            <code className="font-mono">POST …/chat/completions</code> + Bearer)
            funciona — informe a Base URL e o nome do modelo do provedor.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="baseUrl" className="text-sm font-medium">
            Base URL
          </label>
          <input
            id="baseUrl"
            name="baseUrl"
            type="url"
            placeholder="https://api.openai.com/v1"
            defaultValue={baseUrl ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Vazio = OpenAI oficial. Inclua{" "}
            <code className="font-mono">/v1</code> — exemplos:{" "}
            <code className="font-mono">https://api.openai.com/v1</code>,{" "}
            <code className="font-mono">https://api.minimax.io/v1</code>{" "}
            (China:{" "}
            <code className="font-mono">https://api.minimaxi.com/v1</code>). O
            app acrescenta <code className="font-mono">/chat/completions</code>.
          </p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="model" className="text-sm font-medium">
            Modelo
          </label>
          <input
            id="model"
            name="model"
            required
            defaultValue={model || "gpt-4o-mini"}
            placeholder="gpt-4o-mini ou MiniMax-M2.5"
            className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="apiKey" className="text-sm font-medium">
            API Key
          </label>
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={
              configured && apiKeyLast4
                ? `Configurada (…${apiKeyLast4}) — deixe em branco para manter`
                : "sk-…"
            }
            className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm"
          />
          {configured && apiKeyLast4 ? (
            <p className="text-xs text-muted-foreground">
              Chave atual:{" "}
              <code className="font-mono text-foreground">…{apiKeyLast4}</code>
              . A chave completa nunca é exibida de novo.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Armazenada criptografada neste workspace (não no Coolify/.env).
            </p>
          )}
        </div>

        {saveState?.error ? (
          <p className="text-sm text-destructive">{saveState.error}</p>
        ) : null}
        {saveState?.ok && saveState.message ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {saveState.message}
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Ao salvar, o app faz uma chamada de teste ao modelo. Se falhar (URL,
          chave ou modelo inválidos), nada é gravado.
        </p>

        <div>
          <button
            type="submit"
            disabled={savePending}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {savePending ? "Testando e salvando…" : "Salvar e testar"}
          </button>
        </div>
      </form>

      {configured ? (
        <div>
          {clearState?.error ? (
            <p className="mb-2 text-sm text-destructive">{clearState.error}</p>
          ) : null}
          {clearState?.ok && clearState.message ? (
            <p className="mb-2 text-sm text-emerald-700 dark:text-emerald-400">
              {clearState.message}
            </p>
          ) : null}
          <button
            type="button"
            disabled={clearPending}
            onClick={() => setConfirmClear(true)}
            className="inline-flex h-9 items-center rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
          >
            Remover chave
          </button>
          <ConfirmDialog
            open={confirmClear}
            onOpenChange={(next) => {
              if (clearPending) return;
              setConfirmClear(next);
            }}
            title="Remover chave de IA?"
            description="A importação de ATAs por texto deixará de funcionar neste workspace até configurar outra chave."
            confirmLabel="Sim, remover"
            pending={clearPending}
            pendingLabel="Removendo…"
            error={clearState && !clearState.ok ? clearState.error : null}
            onConfirm={() => {
              clearAction(new FormData());
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
