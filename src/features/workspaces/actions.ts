"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import {
  setActiveWorkspaceCookie,
  resolveActiveWorkspace,
} from "@/lib/active-workspace";
import {
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
} from "@/schemas/workspaces";
import { workspaceService } from "@/services/workspaces";

export type WorkspaceFormState =
  | { ok: true; workspaceId?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | undefined;

async function getSessionUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

function flattenZodIssues(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const user = await getSessionUser();
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || "",
    description: formData.get("description") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flattenZodIssues(parsed.error),
    };
  }

  try {
    const workspace = await workspaceService.create(user.id, {
      name: parsed.data.name,
      slug: parsed.data.slug || undefined,
      description: parsed.data.description || null,
    });
    await setActiveWorkspaceCookie(workspace.id);
    revalidatePath("/", "layout");
    revalidatePath("/settings/workspaces");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { ok: true, workspaceId: workspace.id };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}

export async function switchWorkspaceAction(formData: FormData) {
  const user = await getSessionUser();
  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string" || !workspaceId) return;

  const { workspaces } = await resolveActiveWorkspace(user.id);
  const allowed = workspaces.some((w) => w.id === workspaceId);
  if (!allowed) return;

  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/my-tasks");
  revalidatePath("/settings/api");
  revalidatePath("/settings/webhooks");
  revalidatePath("/settings/workspaces");
}

export async function addWorkspaceMemberAction(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const user = await getSessionUser();
  const parsed = addWorkspaceMemberSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    role: formData.get("role") || "MEMBER",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flattenZodIssues(parsed.error),
    };
  }

  try {
    await workspaceService.addMemberByEmail(user.id, parsed.data);
    revalidatePath("/settings/workspaces");
    return { ok: true };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}

export async function removeWorkspaceMemberAction(formData: FormData) {
  const user = await getSessionUser();
  const workspaceId = formData.get("workspaceId");
  const memberId = formData.get("memberId");
  if (typeof workspaceId !== "string" || typeof memberId !== "string") return;

  try {
    await workspaceService.removeMember(user.id, workspaceId, memberId);
    revalidatePath("/settings/workspaces");
  } catch (err) {
    if (err instanceof AppError) return;
    throw err;
  }
}
