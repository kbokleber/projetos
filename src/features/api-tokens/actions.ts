"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/api/auth";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
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
    expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  });

  const scopes = formData.getAll("scopes").map(String);
  const parsed = schema.safeParse({
    name: formData.get("name"),
    scopes,
    expiresInDays: formData.get("expiresInDays") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) return { ok: false, error: "Usuário sem workspace." };

  const { token, prefix, tokenHash } = generateToken();

  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const created = await prisma.apiToken.create({
    data: {
      workspaceId: active.id,
      userId: session.user.id,
      name: parsed.data.name,
      tokenHash,
      prefix,
      scopes: JSON.stringify(parsed.data.scopes),
      expiresAt,
    },
  });

  revalidatePath("/settings/api");
  return { ok: true, token, tokenId: created.id };
}

export async function revokeApiTokenAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const id = formData.get("tokenId");
  if (typeof id !== "string") return;

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) return;

  await prisma.apiToken.updateMany({
    where: {
      id,
      workspaceId: active.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings/api");
}
