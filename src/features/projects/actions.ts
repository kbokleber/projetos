"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { projectService } from "@/services/projects";
import {
  addMemberSchema,
  projectFormSchema,
} from "@/schemas/projects";
import { AppError } from "@/lib/errors";

export type FormState =
  | { ok: true; projectId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | undefined;

async function getSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

function flattenZodIssues(
  err: z.ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getSession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = projectFormSchema.safeParse({
    ...raw,
    startDate: raw.startDate === "" ? undefined : raw.startDate,
    dueDate: raw.dueDate === "" ? undefined : raw.dueDate,
    color: raw.color === "" ? undefined : raw.color,
    icon: raw.icon === "" ? undefined : raw.icon,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flattenZodIssues(parsed.error),
    };
  }

  try {
    const project = await projectService.create(
      { userId: user.id, actorType: "USER" },
      {
        workspaceId: parsed.data.workspaceId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
        status: parsed.data.status,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdBy: user.id,
      },
    );
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { ok: true, projectId: project.id };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[createProject]", err);
    return { ok: false, error: "Não foi possível criar o projeto." };
  }
}

export async function updateProjectAction(
  projectId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getSession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = projectFormSchema.safeParse({
    ...raw,
    startDate: raw.startDate === "" ? undefined : raw.startDate,
    dueDate: raw.dueDate === "" ? undefined : raw.dueDate,
    color: raw.color === "" ? undefined : raw.color,
    icon: raw.icon === "" ? undefined : raw.icon,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flattenZodIssues(parsed.error),
    };
  }

  try {
    await projectService.update(
      { userId: user.id, actorType: "USER" },
      projectId,
      {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
        status: parsed.data.status,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    );
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    return { ok: true, projectId };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[updateProject]", err);
    return { ok: false, error: "Não foi possível salvar o projeto." };
  }
}

export async function archiveProjectAction(projectId: string) {
  const user = await getSession();
  try {
    await projectService.archive(
      { userId: user.id, actorType: "USER" },
      projectId,
    );
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
  } catch (err) {
    console.error("[archiveProject]", err);
  }
  redirect("/projects");
}

export async function unarchiveProjectAction(projectId: string) {
  const user = await getSession();
  await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: null },
  });
  await prisma.activity.create({
    data: {
      workspaceId: (
        await prisma.project.findUniqueOrThrow({ where: { id: projectId } })
      ).workspaceId,
      projectId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      action: "project.updated",
      entityType: "Project",
      entityId: projectId,
      metadata: JSON.stringify({ archived: false }),
    },
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectMemberAction(
  projectId: string,
  _prev: { ok: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const user = await getSession();

  const parsed = addMemberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") || "MEMBER",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { user: { email: parsed.data.email } } } },
  });
  if (!project) return { ok: false, error: "Projeto não encontrado." };

  const memberRow = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!memberRow || memberRow.role === "VIEWER") {
    return { ok: false, error: "Sem permissão para gerenciar membros." };
  }

  const invited = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!invited) return { ok: false, error: "Nenhum usuário com esse email." };

  // Convidado precisa ser membro do workspace
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: project.workspaceId, userId: invited.id },
    },
  });
  if (!workspaceMember) {
    return {
      ok: false,
      error: "Usuário não pertence ao workspace deste projeto.",
    };
  }

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: invited.id } },
    create: { projectId, userId: invited.id, role: parsed.data.role },
    update: { role: parsed.data.role },
  });

  await prisma.activity.create({
    data: {
      workspaceId: project.workspaceId,
      projectId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      action: "member.added",
      entityType: "ProjectMember",
      entityId: invited.id,
      metadata: JSON.stringify({ email: invited.email, role: parsed.data.role }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function removeProjectMemberAction(
  projectId: string,
  userId: string,
) {
  const user = await getSession();
  const memberRow = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!memberRow || (memberRow.role !== "OWNER" && memberRow.role !== "ADMIN")) {
    return;
  }

  // Não permitir remover o último OWNER
  const owners = await prisma.projectMember.count({
    where: { projectId, role: "OWNER" },
  });
  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (target?.role === "OWNER" && owners <= 1) return;

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  await prisma.activity.create({
    data: {
      workspaceId: project.workspaceId,
      projectId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      action: "member.removed",
      entityType: "ProjectMember",
      entityId: userId,
      metadata: JSON.stringify({ removedUserId: userId }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function changeProjectMemberRoleAction(
  projectId: string,
  userId: string,
  role: "ADMIN" | "MEMBER" | "VIEWER",
) {
  const user = await getSession();
  const memberRow = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!memberRow || memberRow.role !== "OWNER") {
    return;
  }
  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  });
  revalidatePath(`/projects/${projectId}`);
}
