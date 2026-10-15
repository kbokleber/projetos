import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateTokenForm } from "@/features/api-tokens/create-form";
import { TokenList } from "@/features/api-tokens/token-list";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import {
  getWorkspaceMemberRole,
  isWorkspaceAdmin,
} from "@/lib/workspace-admin";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";

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

  const role = await getWorkspaceMemberRole(session.user.id, active.id);
  if (!isWorkspaceAdmin(role)) redirect("/dashboard");

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
      <PageHeader
        title="API · Tokens"
        description={
          <>
            Tokens de <strong>{active.name}</strong> (slug:{" "}
            <code className="font-mono text-xs">{active.slug}</code>). O token
            completo é mostrado uma única vez.
          </>
        }
      />
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Escopos separados: tarefas usam{" "}
        <code className="font-mono">tasks:write</code>; ATAs usam{" "}
        <code className="font-mono">meetings:read</code> /{" "}
        <code className="font-mono">meetings:write</code> (não bastam os de
        Projetos). Ambos já vêm em &quot;Recomendado IA&quot;. Tokens antigos
        sem esses escopos devem ser revogados e gerados de novo. Liste
        workspaces em{" "}
        <code className="font-mono">GET /api/v1/workspaces</code>.
      </p>

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
