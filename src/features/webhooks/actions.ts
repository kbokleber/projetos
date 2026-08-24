"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { webhookService } from "@/services/webhooks";
import { z } from "zod";

export async function createWebhookAction(
  _prev: { ok: boolean; error?: string; secret?: string } | undefined,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!member) return { ok: false, error: "Usuário sem workspace." };

  const schema = z.object({
    name: z.string().min(1).max(80),
    url: z.string().url(),
    events: z.array(z.string()).min(1, "Escolha pelo menos um evento"),
  });

  const events = formData.getAll("events").map(String);
  const parsed = schema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    events,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const secret = webhookService.generateSecret();
  await prisma.webhook.create({
    data: {
      workspaceId: member.workspaceId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: JSON.stringify(parsed.data.events),
      secret,
      active: true,
    },
  });

  return { ok: true, secret };
}

export async function toggleWebhookAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = formData.get("webhookId");
  if (typeof id !== "string") return;

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!member) return;

  const webhooks = await prisma.webhook.findMany({
    where: { id, workspaceId: member.workspaceId },
    take: 1,
  });
  if (webhooks.length === 0) return;

  await prisma.webhook.update({
    where: { id },
    data: { active: !webhooks[0].active },
  });
}

export async function deleteWebhookAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = formData.get("webhookId");
  if (typeof id !== "string") return;

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!member) return;

  await prisma.webhook.deleteMany({
    where: { id, workspaceId: member.workspaceId },
  });
}
