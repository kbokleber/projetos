"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authService } from "@/services/auth";
import { adminCreateUserSchema, adminUpdateUserNameSchema } from "@/schemas/auth";
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

export async function adminUpdateUserNameAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  const parsed = adminUpdateUserNameSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nome inválido.",
    };
  }

  const exists = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!exists) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { name: parsed.data.name.trim() },
  });
  revalidatePath("/settings/users");
  return { ok: true };
}

export async function adminDeleteUserAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { ok: false, error: "Usuário inválido." };
  }
  if (userId === me.id) {
    return { ok: false, error: "Você não pode excluir a si mesmo." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true },
  });
  if (!target) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", active: true },
    });
    if (adminCount <= 1) {
      return {
        ok: false,
        error: "Não é possível excluir o último administrador ativo.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Projetos/tarefas exigem createdBy — reatribui ao admin que exclui
      await tx.project.updateMany({
        where: { createdBy: userId },
        data: { createdBy: me.id },
      });
      await tx.task.updateMany({
        where: { createdBy: userId },
        data: { createdBy: me.id },
      });
      await tx.checklistItem.updateMany({
        where: { completedBy: userId },
        data: { completedBy: null },
      });
      await tx.apiToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), userId: null },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (err) {
    console.error("[adminDeleteUser]", err);
    return {
      ok: false,
      error:
        "Não foi possível excluir o usuário. Verifique vínculos pendentes e tente novamente.",
    };
  }

  revalidatePath("/settings/users");
  return { ok: true };
}
