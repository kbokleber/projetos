import { Bot, User, Webhook, Cog } from "lucide-react";

export function ActivityOriginChart({ byOrigin }: { byOrigin: Record<string, number> }) {
  const rows: Array<{ key: string; label: string; icon: React.ReactNode }> = [
    { key: "USER", label: "Você (Web)", icon: <User className="size-3.5" /> },
    { key: "API", label: "IA · API", icon: <Bot className="size-3.5" /> },
    { key: "WEBHOOK", label: "Webhook", icon: <Webhook className="size-3.5" /> },
    { key: "SYSTEM", label: "Sistema", icon: <Cog className="size-3.5" /> },
  ];

  const total = rows.reduce((acc, r) => acc + (byOrigin[r.key] ?? 0), 0) || 1;

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Origem das ações · 7d</h2>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const count = byOrigin[r.key] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={r.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {r.icon}
                  {r.label}
                </span>
                <span className="font-mono text-foreground">{count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
