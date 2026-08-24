"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authService } from "@/services/auth";
import { adminCreateUserSchema } from "@/schemas/auth";
import { AppError } from "@/lib/errors";

export type AdminUserFormState =
  | { ok: true; userId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | undefined;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  // Apenas usuários com role ADMIN podem criar outros usuários
  if (!user || user.role !== "ADMIN") {
    throw new AppError(
      "FORBIDDEN",
      "Você não tem permissão para criar usuários.",
      403,
    );
  }
  return session.user;
}

function flatten(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function adminCreateUserAction(
  _prev: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  await requireAdmin();

  const parsed = adminCreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flatten(parsed.error),
    };
  }

  try {
    const user = await authService.createUserByAdmin({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    revalidatePath("/settings/users");
    return { ok: true, userId: user.id };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[adminCreateUser]", err);
    return { ok: false, error: "Não foi possível criar o usuário." };
  }
}

export async function adminToggleUserActiveAction(formData: FormData) {
  const me = await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string") return;
  if (userId === me.id) return; // não pode desativar a si mesmo
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true },
  });
  if (!u) return;
  await prisma.user.update({
    where: { id: userId },
    data: { active: !u.active },
  });
  revalidatePath("/settings/users");
}

export async function adminChangeUserRoleAction(formData: FormData) {
  const me = await requireAdmin();
  const userId = formData.get("userId");
  const role = formData.get("role");
  if (typeof userId !== "string" || typeof role !== "string") return;

  if (userId === me.id && role !== "ADMIN") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Você não pode rebaixar o seu próprio usuário de ADMIN.",
      400,
    );
  }

  if (role !== "ADMIN" && role !== "USER") return;

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  revalidatePath("/settings/users");
}
