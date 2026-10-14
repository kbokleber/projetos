import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import {
  getWorkspaceMemberRole,
  isWorkspaceAdmin,
} from "@/lib/workspace-admin";
import { workspaceAiService } from "@/services/workspace-ai";
import { AiSettingsForm } from "@/features/workspace-ai/ai-settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsAiPage() {
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

  const canEdit = true;
  const settings = await workspaceAiService.getPublicSettings(active.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Configurações · IA</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">IA / OpenAI</h1>
        <p className="text-sm text-muted-foreground">
          Chave e modelo do workspace <strong>{active.name}</strong> para
          importar ATAs a partir de texto. Compatível com OpenAI e APIs no
          mesmo formato (MiniMax, Azure OpenAI, Ollama, gateways, etc.).
        </p>
        <p className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          A chave fica criptografada no banco deste workspace — não use mais{" "}
          <code className="font-mono">OPENAI_API_KEY</code> no Coolify/.env
          para este recurso.
        </p>
      </div>

      <AiSettingsForm
        canEdit={canEdit}
        configured={settings.configured}
        provider={settings.provider}
        baseUrl={settings.baseUrl}
        model={settings.model}
        apiKeyLast4={settings.apiKeyLast4}
      />
    </div>
  );
}
