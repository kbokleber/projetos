"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { attachmentService } from "@/services/attachments";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type AttachmentActionState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function uploadTaskAttachmentAction(
  taskId: string,
  _prev: AttachmentActionState,
  formData: FormData,
): Promise<AttachmentActionState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo." };
  }

  try {
    const attachment = await attachmentService.upload(user.id, taskId, file);
    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
      select: { projectId: true },
    });
    if (task) {
      revalidatePath(`/projects/${task.projectId}`);
      revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    if (err instanceof Error) return { ok: false, error: err.message };
    console.error("[uploadAttachment]", err);
    return { ok: false, error: "Não foi possível enviar o anexo." };
  }
}

export async function deleteTaskAttachmentAction(
  attachmentId: string,
): Promise<AttachmentActionState> {
  const user = await requireUser();
  try {
    const { projectId, taskId } = await attachmentService.delete(
      user.id,
      attachmentId,
    );
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    if (err instanceof Error) return { ok: false, error: err.message };
    console.error("[deleteAttachment]", err);
    return { ok: false, error: "Não foi possível remover o anexo." };
  }
}
