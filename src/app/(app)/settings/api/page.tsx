import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateTokenForm } from "@/features/api-tokens/create-form";
import { TokenList } from "@/features/api-tokens/token-list";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsApiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!member) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        Usuário não pertence a nenhum workspace.
      </div>
    );
  }

  const tokens = await prisma.apiToken.findMany({
    where: {
      workspaceId: member.workspaceId,
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
          Crie tokens para integrações externas consumirem a API pública. O
          token completo é mostrado uma única vez.
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
