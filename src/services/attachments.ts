import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  assertAllowedUpload,
  deleteLocalFile,
  readLocalFile,
  saveLocalFile,
} from "@/lib/storage";

async function assertTaskAccess(
  userId: string,
  taskId: string,
  mode: "read" | "write",
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      completedAt: true,
      archivedAt: true,
      project: { select: { workspaceId: true } },
    },
  });
  if (!task) throw new AppError("NOT_FOUND", "Tarefa não encontrada.", 404);

  const { assertProjectAccess } = await import("@/lib/project-access");
  await assertProjectAccess(
    userId,
    task.projectId,
    mode === "write" ? "edit" : "view",
  );

  if (mode === "write" && (task.completedAt || task.archivedAt)) {
    throw new AppError(
      "FORBIDDEN",
      task.archivedAt
        ? "Tarefa arquivada: anexos somente leitura."
        : "Reabra a tarefa para alterar anexos.",
      403,
    );
  }

  return {
    taskId: task.id,
    projectId: task.projectId,
    workspaceId: task.project.workspaceId,
  };
}

export const attachmentService = {
  async listForTask(userId: string, taskId: string) {
    await assertTaskAccess(userId, taskId, "read");
    return prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async upload(userId: string, taskId: string, file: File) {
    const access = await assertTaskAccess(userId, taskId, "write");
    const { mime, fileName } = assertAllowedUpload({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveLocalFile({
      workspaceId: access.workspaceId,
      taskId,
      fileName,
      bytes,
    });

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId,
        fileName,
        fileUrl: saved.relative,
        mimeType: mime,
        size: bytes.length,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        projectId: access.projectId,
        taskId,
        userId,
        actorType: "USER",
        actorId: userId,
        action: "attachment.created",
        entityType: "Attachment",
        entityId: attachment.id,
        metadata: JSON.stringify({ fileName, size: bytes.length, mime }),
      },
    });

    return attachment;
  },

  async delete(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        taskId: true,
        fileUrl: true,
        fileName: true,
        userId: true,
      },
    });
    if (!attachment) {
      throw new AppError("NOT_FOUND", "Anexo não encontrado.", 404);
    }

    const access = await assertTaskAccess(userId, attachment.taskId, "write");
    await deleteLocalFile(attachment.fileUrl);
    await prisma.attachment.delete({ where: { id: attachment.id } });

    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        projectId: access.projectId,
        taskId: attachment.taskId,
        userId,
        actorType: "USER",
        actorId: userId,
        action: "attachment.deleted",
        entityType: "Attachment",
        entityId: attachment.id,
        metadata: JSON.stringify({ fileName: attachment.fileName }),
      },
    });

    return { projectId: access.projectId, taskId: attachment.taskId };
  },

  async getForDownload(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new AppError("NOT_FOUND", "Anexo não encontrado.", 404);
    }
    await assertTaskAccess(userId, attachment.taskId, "read");
    const bytes = await readLocalFile(attachment.fileUrl);
    return { attachment, bytes };
  },
};
