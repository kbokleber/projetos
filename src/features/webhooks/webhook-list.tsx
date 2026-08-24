import { Button } from "@/components/ui/button";
import { dateTimeBR } from "@/lib/format-date";

type WebhookSummary = {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  lastDelivery: {
    status: string;
    createdAt: Date;
    statusCode: number | null;
    errorMessage: string | null;
  } | null;
  totalDeliveries: number;
  failedDeliveries: number;
};

export function WebhookList({
  webhooks,
  onToggle,
  onDelete,
}: {
  webhooks: WebhookSummary[];
  onToggle: (formData: FormData) => void | Promise<void>;
  onDelete: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Webhooks configurados</h2>
      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum webhook configurado ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{w.name}</span>
                    {w.active ? (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                        Ativo
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Pausado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {w.url}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.events.map((e) => (
                      <code
                        key={e}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs"
                      >
                        {e}
                      </code>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {w.totalDeliveries} entrega(s) ·{" "}
                    {w.failedDeliveries === 0
                      ? "todas com sucesso"
                      : `${w.failedDeliveries} falha(s)`}
                    {w.lastDelivery && (
                      <>
                        {" · "}
                        última:{" "}
                        <span
                          className={
                            w.lastDelivery.status === "SUCCESS"
                              ? "text-emerald-700"
                              : w.lastDelivery.status === "PENDING"
                                ? "text-amber-700"
                                : "text-destructive"
                          }
                        >
                          {w.lastDelivery.status}
                          {w.lastDelivery.statusCode
                            ? ` ${w.lastDelivery.statusCode}`
                            : ""}
                        </span>{" "}
                        ({dateTimeBR(w.lastDelivery.createdAt)})
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={onToggle}>
                    <input type="hidden" name="webhookId" value={w.id} />
                    <Button type="submit" variant="outline" size="sm">
                      {w.active ? "Pausar" : "Ativar"}
                    </Button>
                  </form>
                  <form action={onDelete}>
                    <input type="hidden" name="webhookId" value={w.id} />
                    <Button type="submit" variant="destructive" size="sm">
                      Remover
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
