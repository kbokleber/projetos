"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checklistService } from "@/services/checklists";
import { AppError } from "@/lib/errors";

export type ChecklistActionState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

function revalidateTask(projectId: string, taskId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

export async function addChecklistItemAction(
  taskId: string,
  _prev: ChecklistActionState,
  formData: FormData,
): Promise<ChecklistActionState> {
  const user = await requireUser();
  const description = String(formData.get("description") ?? "");
  try {
    const { projectId } = await checklistService.addItem(
      user.id,
      taskId,
      description,
    );
    revalidateTask(projectId, taskId);
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[addChecklistItem]", err);
    return { ok: false, error: "Não foi possível adicionar o item." };
  }
}

export async function toggleChecklistItemAction(itemId: string) {
  const user = await requireUser();
  try {
    const { projectId, taskId } = await checklistService.toggleItem(
      user.id,
      itemId,
    );
    revalidateTask(projectId, taskId);
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AppError) return { ok: false as const, error: err.message };
    console.error("[toggleChecklistItem]", err);
    return { ok: false as const, error: "Não foi possível atualizar o item." };
  }
}

export async function updateChecklistItemAction(
  itemId: string,
  description: string,
) {
  const user = await requireUser();
  try {
    const { projectId, taskId } = await checklistService.updateItem(
      user.id,
      itemId,
      description,
    );
    revalidateTask(projectId, taskId);
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AppError) return { ok: false as const, error: err.message };
    console.error("[updateChecklistItem]", err);
    return { ok: false as const, error: "Não foi possível salvar o item." };
  }
}

export async function deleteChecklistItemAction(itemId: string) {
  const user = await requireUser();
  try {
    const { projectId, taskId } = await checklistService.deleteItem(
      user.id,
      itemId,
    );
    revalidateTask(projectId, taskId);
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AppError) return { ok: false as const, error: err.message };
    console.error("[deleteChecklistItem]", err);
    return { ok: false as const, error: "Não foi possível remover o item." };
  }
}

export async function reorderChecklistItemsAction(
  taskId: string,
  orderedItemIds: string[],
) {
  const user = await requireUser();
  try {
    const { projectId } = await checklistService.reorderItems(
      user.id,
      taskId,
      orderedItemIds,
    );
    revalidateTask(projectId, taskId);
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AppError) return { ok: false as const, error: err.message };
    console.error("[reorderChecklistItems]", err);
    return { ok: false as const, error: "Não foi possível reordenar a lista." };
  }
}
