import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardService } from "@/services/dashboard";
import { ActivityFeed } from "@/features/dashboard/activity-feed";
import { SummaryCards } from "@/features/dashboard/summary-cards";
import { ActivityOriginChart } from "@/features/dashboard/activity-origin";
import { RecentApiTasks } from "@/features/dashboard/recent-api-tasks";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
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

  const [summary, recentActivity, activityByOrigin, recentApiTasks] =
    await Promise.all([
      dashboardService.summary(active.id),
      dashboardService.recentActivity(active.id, 15),
      dashboardService.activityByOrigin(active.id),
      dashboardService.recentApiTasks(active.id, 8),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Acompanhamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão executiva de <strong>{active.name}</strong>. Aqui você vê o que
          está acontecendo, incluindo tudo o que a <strong>IA</strong> fez via
          API.
        </p>
      </div>

      <SummaryCards
        projectsActive={summary.projectsActive}
        tasksOpen={summary.tasksOpen}
        tasksCompletedToday={summary.tasksCompletedToday}
        tasksOverdue={summary.tasksOverdue}
        apiTasksCreatedToday={summary.apiTasksCreatedToday}
        webhookDeliveriesLast7d={summary.webhookDeliveriesLast7d}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed items={recentActivity} />
        </div>
        <div className="flex flex-col gap-4">
          <ActivityOriginChart byOrigin={activityByOrigin} />
          <RecentApiTasks tasks={recentApiTasks} />
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <p>
          Para acompanhar as integrações, abra{" "}
          <Link href="/settings/api" className="text-primary underline">
            Tokens de API
          </Link>{" "}
          ou{" "}
          <Link href="/settings/webhooks" className="text-primary underline">
            Webhooks
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
