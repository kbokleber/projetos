"use server";

import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { assertWorkspaceAdmin } from "@/lib/workspace-admin";
import { workspaceAiService } from "@/services/workspace-ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const saveSchema = z.object({
  provider: z.string().min(1).max(64).default("openai"),
  baseUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  model: z.string().trim().min(1).max(120),
  apiKey: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : null)),
});

export type WorkspaceAiActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function saveWorkspaceAiSettingsAction(
  _prev: WorkspaceAiActionState | undefined,
  formData: FormData,
): Promise<WorkspaceAiActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) return { ok: false, error: "Usuário sem workspace." };

  try {
    await assertWorkspaceAdmin(session.user.id, active.id);

    const parsed = saveSchema.safeParse({
      provider: formData.get("provider") || "openai",
      baseUrl: formData.get("baseUrl") ?? "",
      model: formData.get("model"),
      apiKey: formData.get("apiKey") ?? "",
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    if (parsed.data.baseUrl && !/^https?:\/\//i.test(parsed.data.baseUrl)) {
      return {
        ok: false,
        error: "Base URL deve começar com http:// ou https://.",
      };
    }

    const input = {
      provider: parsed.data.provider,
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey,
    };

    // Testa o provedor antes de gravar — não salva se a chamada falhar
    const tested = await workspaceAiService.buildAndTestConfig(
      active.id,
      input,
    );

    await workspaceAiService.upsertSettings(active.id, session.user.id, {
      ...input,
      // Persiste a Base URL já normalizada (ex.: acrescenta /v1 no MiniMax)
      baseUrl: tested.baseUrl,
      model: tested.model,
    });

    revalidatePath("/settings/ai");
    return {
      ok: true,
      message: `Configuração salva e testada com sucesso (modelo ${tested.model}).`,
    };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[saveWorkspaceAiSettings]", err);
    return { ok: false, error: "Não foi possível salvar a configuração." };
  }
}

export async function clearWorkspaceAiSettingsAction(
  _prev: WorkspaceAiActionState | undefined,
  _formData: FormData,
): Promise<WorkspaceAiActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) return { ok: false, error: "Usuário sem workspace." };

  try {
    await assertWorkspaceAdmin(session.user.id, active.id);
    await workspaceAiService.clearSettings(active.id);
    revalidatePath("/settings/ai");
    return { ok: true, message: "Chave de IA removida deste workspace." };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[clearWorkspaceAiSettings]", err);
    return { ok: false, error: "Não foi possível remover a configuração." };
  }
}
