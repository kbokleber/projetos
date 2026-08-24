"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/api/auth";
import { z } from "zod";

export type CreateTokenResult =
  | { ok: true; token: string; tokenId: string }
  | { ok: false; error: string };

export async function createApiTokenAction(
  _prev: CreateTokenResult | undefined,
  formData: FormData,
): Promise<CreateTokenResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const schema = z.object({
    name: z.string().min(1).max(80),
    scopes: z.array(z.string()).min(1, "Escolha pelo menos um escopo"),
    workspaceId: z.string().optional(),
    expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  });

  const scopes = formData.getAll("scopes").map(String);
  const parsed = schema.safeParse({
    name: formData.get("name"),
    scopes,
    workspaceId: formData.get("workspaceId") || undefined,
    expiresInDays: formData.get("expiresInDays") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  // Identifica o workspace do usuário
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!member) return { ok: false, error: "Usuário sem workspace." };

  const { token, prefix, tokenHash } = generateToken();

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await prisma.apiToken.create({
    data: {
      workspaceId: member.workspaceId,
      userId: session.user.id,
      name: parsed.data.name,
      tokenHash,
      prefix,
      scopes: JSON.stringify(parsed.data.scopes),
      expiresAt,
    },
  });

  return { ok: true, token, tokenId: created.id };
}

export async function revokeApiTokenAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = formData.get("tokenId");
  if (typeof id !== "string") return;

  // Só permite revogar tokens do próprio workspace do usuário
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!member) return;

  await prisma.apiToken.updateMany({
    where: {
      id,
      workspaceId: member.workspaceId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings/api");
}
