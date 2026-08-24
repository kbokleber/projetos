"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeApiTokenAction } from "@/features/api-tokens/actions";
import { dateTimeBR } from "@/lib/format-date";

type Token = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

export function TokenList({ tokens }: { tokens: Token[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRevoke(token: Token) {
    const ok = confirm(
      `Revogar o token "${token.name}"?\n\n` +
        `Ele deixará de funcionar imediatamente. Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("tokenId", token.id);
    setPendingId(token.id);
    startTransition(async () => {
      try {
        await revokeApiTokenAction(fd);
      } finally {
        setPendingId(null);
      }
    });
  }

  if (tokens.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-medium">Tokens ativos</h2>
        <p className="text-sm text-muted-foreground">
          Nenhum token criado ainda.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Tokens ativos</h2>
      <div className="flex flex-col gap-2">
        {tokens.map((t) => {
          const expired = t.expiresAt && t.expiresAt < new Date();
          const busy = pendingId === t.id;
          return (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  {expired ? (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
                      Expirado
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                      Ativo
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {t.prefix}…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.scopes.length} escopo(s) · criado{" "}
                  {dateTimeBR(t.createdAt)} ·{" "}
                  {t.lastUsedAt
                    ? `último uso ${dateTimeBR(t.lastUsedAt)}`
                    : "nunca usado"}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => handleRevoke(t)}
              >
                {busy ? "Revogando..." : "Revogar"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
