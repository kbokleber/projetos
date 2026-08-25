import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { workspaceService } from "@/services/workspaces";
import { CreateWorkspaceForm } from "@/features/workspaces/create-form";
import { WorkspaceMembersPanel } from "@/features/workspaces/members-panel";
import { switchWorkspaceAction } from "@/features/workspaces/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsWorkspacesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  const workspaces = await workspaceService.listForUser(session.user.id);

  const activeId = active?.id ?? workspaces[0]?.id;
  const members = activeId
    ? await workspaceService.listMembers(session.user.id, activeId)
    : [];

  const activeMeta = workspaces.find((w) => w.id === activeId);
  const myRole = activeMeta?.members[0]?.role;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span>Configurações</span>
          <span>/</span>
          <span className="text-foreground">Workspaces</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Você pode participar de um ou mais workspaces. Troque o ativo no menu
          lateral; projetos, dashboard e integrações seguem o workspace
          selecionado.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Seus workspaces</h2>
        {workspaces.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
            Nenhum workspace ainda. Crie o primeiro abaixo.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {workspaces.map((w) => {
              const role = w.members[0]?.role ?? "MEMBER";
              const isActive = w.id === activeId;
              return (
                <li
                  key={w.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium tracking-tight">{w.name}</p>
                      {isActive && (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{w.slug} · {role} · {w._count.members} membro(s) ·{" "}
                      {w._count.projects} projeto(s)
                    </p>
                    {w.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {w.description}
                      </p>
                    )}
                  </div>
                  {!isActive && (
                    <form action={switchWorkspaceAction}>
                      <input type="hidden" name="workspaceId" value={w.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Ativar
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Clique em <strong>Ativar</strong> ou use o seletor no rodapé do menu
          lateral.{" "}
          <Link href="/dashboard" className="text-primary underline">
            Ir ao dashboard
          </Link>
        </p>
      </section>

      {activeId && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Membros — {activeMeta?.name ?? "workspace ativo"}
          </h2>
          <WorkspaceMembersPanel
            workspaceId={activeId}
            members={members}
            canManage={canManage}
            currentUserId={session.user.id}
          />
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium">Criar novo workspace</h2>
        <p className="text-xs text-muted-foreground">
          Você será o dono (OWNER). Depois pode convidar outros usuários pelo
          e-mail.
        </p>
        <CreateWorkspaceForm />
      </section>
    </div>
  );
}
