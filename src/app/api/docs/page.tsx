"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            Documentação da API
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sistema de Projetos · API v1
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cole seu token no botão <strong>Authorize</strong> no topo. Formato:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              pk_live_…
            </code>
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-card p-4 text-sm">
          <h2 className="font-medium tracking-tight">Guia rápido para IAs</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>
              Autentique com{" "}
              <code className="font-mono text-xs text-foreground">
                Authorization: Bearer pk_live_…
              </code>
            </li>
            <li>
              Liste workspaces:{" "}
              <code className="font-mono text-xs text-foreground">
                GET /api/v1/workspaces
              </code>{" "}
              — anote o <strong className="text-foreground">slug</strong> (ex.:{" "}
              <code className="font-mono text-xs">cleartech</code>).
            </li>
            <li>
              Crie o projeto no workspace certo:
              <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
{`POST /api/v1/projects
{
  "name": "Nome do projeto",
  "workspaceSlug": "cleartech"
}`}
              </pre>
              Alternativa:{" "}
              <code className="font-mono text-xs text-foreground">
                {`"workspace": "Projeto Cleartech"`}
              </code>
            </li>
            <li>
              Sem <code className="font-mono text-xs">workspaceSlug</code> /{" "}
              <code className="font-mono text-xs">workspace</code>, o projeto vai
              para o workspace <strong className="text-foreground">padrão do token</strong>{" "}
              (pode ser o errado).
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Spec OpenAPI:{" "}
            <a href="/api/openapi.json" className="text-primary underline">
              /api/openapi.json
            </a>
          </p>
        </section>

        <SwaggerUI url="/api/openapi.json" docExpansion="list" defaultModelsExpandDepth={1} />
      </div>
    </main>
  );
}
