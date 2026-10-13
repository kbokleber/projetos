export const dynamic = "force-dynamic";

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <header>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            Documentação da API
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sistema de Projetos · API v1
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cole seu token no botão <strong>Authorize</strong> no topo do
            Swagger. Formato:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              pk_live_…
            </code>
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-medium tracking-tight">Guia rápido</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Spec:{" "}
              <a href="/api/openapi.json" className="text-primary underline">
                /api/openapi.json
              </a>
            </li>
            <li>
              ATAs: escopos{" "}
              <code className="font-mono text-xs text-foreground">
                meetings:read
              </code>{" "}
              /{" "}
              <code className="font-mono text-xs text-foreground">
                meetings:write
              </code>
            </li>
            <li>
              Abrir só o Swagger:{" "}
              <a href="/api/docs/embed" className="text-primary underline">
                /api/docs/embed
              </a>
            </li>
          </ul>
        </section>

        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <iframe
            title="Swagger UI"
            src="/api/docs/embed"
            className="h-[min(85vh,1200px)] w-full border-0"
          />
        </div>
      </div>
    </main>
  );
}
