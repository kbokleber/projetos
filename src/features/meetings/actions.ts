"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { meetingFormSchema } from "@/schemas/meetings";
import { meetingService } from "@/services/meetings";
import { AppError } from "@/lib/errors";

export type MeetingFormState =
  | { ok: true; meetingId: string; projectId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | undefined;

async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function parseParticipants(formData: FormData) {
  const memberIds = formData
    .getAll("memberIds")
    .map(String)
    .filter(Boolean);
  const guestsRaw = String(formData.get("guests") ?? "");
  const guests = guestsRaw
    .split(/[\n,;]+/)
    .map((g) => g.trim())
    .filter(Boolean);
  return { memberIds, guests };
}

function parseForm(formData: FormData) {
  const publishedRaw = formData.get("published");
  return meetingFormSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    heldAt: formData.get("heldAt"),
    integrationId: formData.get("integrationId") || null,
    description: String(formData.get("description") ?? ""),
    published:
      publishedRaw === "true" ||
      publishedRaw === "on" ||
      publishedRaw === "1",
    ...parseParticipants(formData),
  });
}

export async function createMeetingAction(
  projectId: string,
  _prev: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flatten(parsed.error),
    };
  }

  try {
    const meeting = await meetingService.create(user.id, {
      projectId,
      title: parsed.data.title,
      type: parsed.data.type,
      heldAt: new Date(parsed.data.heldAt),
      integrationId: parsed.data.integrationId,
      description: parsed.data.description,
      published: parsed.data.published,
      participants: {
        memberIds: parsed.data.memberIds,
        guests: parsed.data.guests,
      },
      createdBy: user.id,
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/meetings`);
    return { ok: true, meetingId: meeting.id, projectId };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[createMeeting]", err);
    return { ok: false, error: "Não foi possível criar a reunião." };
  }
}

export async function updateMeetingAction(
  meetingId: string,
  projectId: string,
  _prev: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors: flatten(parsed.error),
    };
  }

  try {
    await meetingService.update(user.id, meetingId, {
      title: parsed.data.title,
      type: parsed.data.type,
      heldAt: new Date(parsed.data.heldAt),
      integrationId: parsed.data.integrationId,
      description: parsed.data.description,
      published: parsed.data.published,
      participants: {
        memberIds: parsed.data.memberIds,
        guests: parsed.data.guests,
      },
    });
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/meetings`);
    revalidatePath(`/projects/${projectId}/meetings/${meetingId}`);
    return { ok: true, meetingId, projectId };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[updateMeeting]", err);
    return { ok: false, error: "Não foi possível salvar a reunião." };
  }
}

export async function deleteMeetingAction(
  meetingId: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  try {
    const { projectId } = await meetingService.remove(user.id, meetingId);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/meetings`);
    return { ok: true, projectId };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[deleteMeeting]", err);
    return { ok: false, error: "Não foi possível excluir a reunião." };
  }
}
