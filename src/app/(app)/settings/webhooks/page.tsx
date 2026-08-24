import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CreateWebhookForm } from "@/features/webhooks/create-form";
import { WebhookList } from "@/features/webhooks/webhook-list";
import { deleteWebhookAction, toggleWebhookAction } from "@/features/webhooks/actions";

export const dynamic = "force-dynamic";

export default async function SettingsWebhooksPage() {
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

  const webhooks = await prisma.webhook.findMany({
    where: { workspaceId: member.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    webhooks.map(async (w) => {
      const last = await prisma.webhookDelivery.findFirst({
        where: { webhookId: w.id },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true, statusCode: true, errorMessage: true },
      });
      const totalDeliveries = await prisma.webhookDelivery.count({
        where: { webhookId: w.id },
      });
      const failedDeliveries = await prisma.webhookDelivery.count({
        where: { webhookId: w.id, status: "FAILED" },
      });
      return {
        ...w,
        events: (() => {
          try {
            return JSON.parse(w.events) as string[];
          } catch {
            return [];
          }
        })(),
        lastDelivery: last,
        totalDeliveries,
        failedDeliveries,
      };
    }),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">Configurações · Webhooks</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Receba eventos do sistema em um endpoint HTTP. Cada entrega é
          assinada com HMAC SHA-256 no header <code className="font-mono">X-Webhook-Signature</code>.
        </p>
      </div>

      <CreateWebhookForm />

      <WebhookList
        webhooks={enriched}
        onToggle={toggleWebhookAction}
        onDelete={deleteWebhookAction}
      />

      <section className="rounded-xl border border-border bg-card p-4 text-xs">
        <p className="font-medium text-foreground">Eventos disponíveis</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-muted-foreground sm:grid-cols-3">
          <li><code className="font-mono">project.created</code></li>
          <li><code className="font-mono">project.updated</code></li>
          <li><code className="font-mono">task.created</code></li>
          <li><code className="font-mono">task.updated</code></li>
          <li><code className="font-mono">task.moved</code></li>
          <li><code className="font-mono">task.completed</code></li>
          <li><code className="font-mono">task.deleted</code></li>
          <li><code className="font-mono">comment.created</code></li>
          <li><code className="font-mono">webhook.test</code></li>
        </ul>
      </section>
    </div>
  );
}
