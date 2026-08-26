import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateTokenForm } from "@/features/api-tokens/create-form";
import { TokenList } from "@/features/api-tokens/token-list";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsApiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);

  if (!active) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        Usuário não pertence a nenhum workspace.{" "}
        <Link href="/settings/workspaces" className="text-primary underline">
          Criar workspace
        </Link>
      </div>
    );
  }

  const tokens = await prisma.apiToken.findMany({
    where: {
      workspaceId: active.id,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Configurações · API</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">API · Tokens</h1>
        <p className="text-sm text-muted-foreground">
          Tokens de <strong>{active.name}</strong> (slug:{" "}
          <code className="font-mono text-xs">{active.slug}</code>). O token
          completo é mostrado uma única vez.
        </p>
        <p className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Para a IA criar/editar tarefas, o token precisa de{" "}
          <code className="font-mono">tasks:write</code> (já vem marcado em
          &quot;Recomendado IA&quot;). Exemplo PATCH:{" "}
          <code className="font-mono">
            {`PATCH /api/v1/tasks/{id} {"priority":"HIGH"}`}
          </code>
          . Tokens antigos sem esse escopo devem ser revogados e gerados de
          novo. Liste workspaces em{" "}
          <code className="font-mono">GET /api/v1/workspaces</code>.
        </p>
      </div>

      <CreateTokenForm />

      <TokenList
        tokens={tokens.map((t) => ({
          id: t.id,
          name: t.name,
          prefix: t.prefix,
          createdAt: t.createdAt,
          lastUsedAt: t.lastUsedAt,
          expiresAt: t.expiresAt,
          scopes: (() => {
            try {
              return JSON.parse(t.scopes) as string[];
            } catch {
              return [];
            }
          })(),
        }))}
      />

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Documentação</p>
        <p>
          Acesse a documentação OpenAPI interativa em{" "}
          <Link href="/api/docs" className="text-primary underline">
            /api/docs
          </Link>{" "}
          ou a especificação em{" "}
          <Link href="/api/openapi.json" className="text-primary underline">
            /api/openapi.json
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
