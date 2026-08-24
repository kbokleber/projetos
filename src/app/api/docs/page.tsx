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
            Cole seu token no botão <strong>Authorize</strong> no topo. Formato
            esperado:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              pk_live_…
            </code>
          </p>
        </header>
        <SwaggerUI url="/api/openapi.json" />
      </div>
    </main>
  );
}
