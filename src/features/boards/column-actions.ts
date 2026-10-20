"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { columnService } from "@/services/boards";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type ColumnActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

async function assertBoardEditAccess(userId: string, boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, projectId: true },
  });
  if (!board) throw new AppError("NOT_FOUND", "Board não encontrado.", 404);
  const { assertProjectAccess } = await import("@/lib/project-access");
  await assertProjectAccess(userId, board.projectId, "edit");
  return board;
}

const nameSchema = z.string().trim().min(1, "Informe o nome.").max(120);

export async function createBoardColumnAction(input: {
  boardId: string;
  projectId: string;
  name: string;
  color?: string | null;
}): Promise<ColumnActionResult> {
  const user = await getSessionUser();
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  try {
    await assertBoardEditAccess(user.id, input.boardId);
    await columnService.create(
      { userId: user.id, actorType: "USER" },
      input.boardId,
      {
        name: parsed.data,
        color: input.color ?? null,
      },
    );
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[createBoardColumn]", err);
    return { ok: false, error: "Não foi possível criar a etapa." };
  }
}

export async function renameBoardColumnAction(input: {
  columnId: string;
  projectId: string;
  name: string;
}): Promise<ColumnActionResult> {
  const user = await getSessionUser();
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  }

  try {
    const col = await prisma.boardColumn.findUnique({
      where: { id: input.columnId },
      select: { boardId: true },
    });
    if (!col) return { ok: false, error: "Coluna não encontrada." };
    await assertBoardEditAccess(user.id, col.boardId);
    await columnService.update(
      { userId: user.id, actorType: "USER" },
      input.columnId,
      { name: parsed.data },
    );
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[renameBoardColumn]", err);
    return { ok: false, error: "Não foi possível renomear a etapa." };
  }
}

export async function deleteBoardColumnAction(input: {
  columnId: string;
  projectId: string;
}): Promise<ColumnActionResult> {
  const user = await getSessionUser();

  try {
    const col = await prisma.boardColumn.findUnique({
      where: { id: input.columnId },
      select: { boardId: true },
    });
    if (!col) return { ok: false, error: "Coluna não encontrada." };
    await assertBoardEditAccess(user.id, col.boardId);
    await columnService.remove(
      { userId: user.id, actorType: "USER" },
      input.columnId,
    );
    revalidatePath(`/projects/${input.projectId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[deleteBoardColumn]", err);
    return { ok: false, error: "Não foi possível excluir a etapa." };
  }
}
