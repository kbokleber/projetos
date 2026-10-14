import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { meetingService } from "@/services/meetings";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Plus, Share2 } from "lucide-react";
import { dateTimeBR } from "@/lib/format-date";
import { AppError } from "@/lib/errors";
import {
  getProjectAccess,
  projectWhereForUser,
} from "@/lib/project-access";
import { MEETING_TYPES } from "@/schemas/meetings";
import { MeetingsFilters } from "@/features/meetings/meetings-filters";
import type { MeetingType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  ATA: "ATA",
  DAILY: "Daily",
  HANDS_ON: "Hands On",
};

function parseDateStart(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDateEnd(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ProjectMeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    published?: string;
    integrationId?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { projectId } = await params;
  const sp = await searchParams;

  const access = await getProjectAccess(session.user.id, projectId);
  if (!access?.canView) notFound();

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      AND: [projectWhereForUser(session.user.id)],
    },
    select: {
      id: true,
      name: true,
      workspaceId: true,
    },
  });
  if (!project) notFound();

  const canEdit = access.canEdit;

  const q = (sp.q ?? "").trim();
  const typeRaw = (sp.type ?? "").trim();
  const type = (MEETING_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as MeetingType)
    : undefined;
  const fromStr = (sp.from ?? "").trim();
  const toStr = (sp.to ?? "").trim();
  const publishedRaw = (sp.published ?? "").trim();
  const published =
    publishedRaw === "true"
      ? true
      : publishedRaw === "false"
        ? false
        : undefined;
  const integrationId = (sp.integrationId ?? "").trim();

  const hasActiveFilters = Boolean(
    q ||
      type ||
      fromStr ||
      toStr ||
      published !== undefined ||
      integrationId,
  );

  let meetings;
  try {
    meetings = await meetingService.listByProject(session.user.id, projectId, {
      q: q || undefined,
      type,
      from: parseDateStart(fromStr),
      to: parseDateEnd(toStr),
      published,
      integrationId: integrationId || undefined,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === "FORBIDDEN") notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          {project.name}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              ATAs e reuniões
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {meetings.length}{" "}
              {meetings.length === 1 ? "registro" : "registros"}
              {hasActiveFilters ? " (filtrado)" : ""}
            </p>
          </div>
          {canEdit && (
            <Button asChild size="sm">
              <Link href={`/projects/${projectId}/meetings/new`}>
                <Plus className="size-3.5" />
                Nova reunião
              </Link>
            </Button>
          )}
        </div>
      </header>

      <MeetingsFilters
        projectId={projectId}
        hasActiveFilters={hasActiveFilters}
        values={{
          q,
          type: type ?? "",
          from: fromStr,
          to: toStr,
          published: publishedRaw === "true" || publishedRaw === "false"
            ? publishedRaw
            : "",
          integrationId,
        }}
      />

      {meetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Nenhuma ATA corresponde aos filtros informados."
              : "Nenhuma ATA ou reunião cadastrada neste projeto."}
          </p>
          {hasActiveFilters ? (
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href={`/projects/${projectId}/meetings`}>
                Limpar filtros
              </Link>
            </Button>
          ) : canEdit ? (
            <Button asChild size="sm" className="mt-4">
              <Link href={`/projects/${projectId}/meetings/new`}>
                <Plus className="size-3.5" />
                Criar primeira reunião
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {meetings.map((m) => {
            const memberNames = m.participants
              .filter((p) => p.user)
              .map((p) => p.user!.name ?? p.user!.email);
            const guests = m.participants
              .filter((p) => p.guestName)
              .map((p) => p.guestName!);
            const names = [...memberNames, ...guests];
            return (
              <li key={m.id}>
                <Link
                  href={`/projects/${projectId}/meetings/${m.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{m.title}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                      {m.published && (
                        <span
                          title="Compartilhado"
                          className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-700 dark:text-sky-300"
                        >
                          <Share2 className="size-3" />
                          Shared
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {names.length > 0
                        ? names.slice(0, 4).join(", ") +
                          (names.length > 4 ? ` +${names.length - 4}` : "")
                        : "Sem participantes"}
                      {m.integrationId
                        ? ` · Integration: ${m.integrationId}`
                        : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {dateTimeBR(m.heldAt)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
