"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { authService } from "@/services/auth";
import { AppError, toErrorResponse } from "@/lib/errors";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/schemas/auth";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(zodError: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of zodError.issues) {
    const path = issue.path.join(".");
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

function toActionResult(error: unknown): ActionResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  const res = toErrorResponse(error);
  return { ok: false, error: res.error.message };
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    return { ok: false, error: "E-mail ou senha inválidos." };
  }
}

export async function signupAction(): Promise<ActionResult> {
  return {
    ok: false,
    error:
      "O cadastro público está desabilitado. Peça ao administrador para criar sua conta.",
  };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function forgotPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult & { devToken?: string; devEmail?: string }> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { ok: false, error: "E-mail inválido.", fieldErrors: fieldErrors(parsed.error) };
  }

  const result = await authService.requestPasswordReset(parsed.data.email);
  if (result.delivered) {
    return {
      ok: true,
      // Em dev: expõe o token para teste. Em produção: remover e enviar por e-mail.
      devToken: result.token,
      devEmail: result.email,
    };
  }
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error) };
  }

  try {
    await authService.resetPassword(parsed.data);
  } catch (error) {
    return toActionResult(error);
  }

  redirect("/login?reset=1");
}
