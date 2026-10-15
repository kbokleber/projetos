import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardService } from "@/services/dashboard";
import { SummaryCards } from "@/features/dashboard/summary-cards";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const summary = await dashboardService.summary(active.id, session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Acompanhamento"
        description={
          <>
            Visão executiva de <strong>{active.name}</strong>.
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/projects">Ver projetos</Link>
          </Button>
        }
      />

      <SummaryCards
        projectsActive={summary.projectsActive}
        tasksOpen={summary.tasksOpen}
        tasksCompletedToday={summary.tasksCompletedToday}
        tasksOverdue={summary.tasksOverdue}
        apiTasksCreatedToday={summary.apiTasksCreatedToday}
        webhookDeliveriesLast7d={summary.webhookDeliveriesLast7d}
      />
    </div>
  );
}
