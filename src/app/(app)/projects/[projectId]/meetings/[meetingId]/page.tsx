import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { meetingService } from "@/services/meetings";
import { MeetingForm } from "@/features/meetings/meeting-form";
import { AppError } from "@/lib/errors";
import { MEETING_TYPES } from "@/schemas/meetings";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; meetingId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { projectId, meetingId } = await params;

  let meeting;
  try {
    meeting = await meetingService.getById(session.user.id, meetingId);
  } catch (err) {
    if (err instanceof AppError) notFound();
    throw err;
  }
  if (meeting.projectId !== projectId) notFound();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const myMembership = project.members.find(
    (m) => m.userId === session.user.id,
  );
  const isWsMember = myMembership
    ? false
    : !!(await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: session.user.id,
        },
        select: { id: true },
      }));
  const canEdit =
    (!!myMembership && myMembership.role !== "VIEWER") || isWsMember;

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const shareOrigin = `${proto}://${host}`;

  const memberIds = meeting.participants
    .filter((p) => p.userId)
    .map((p) => p.userId!);
  const guests = meeting.participants
    .filter((p) => p.guestName)
    .map((p) => p.guestName!);

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-16 pt-2 md:px-2">
      <MeetingForm
        mode="edit"
        projectId={project.id}
        projectName={project.name}
        meetingId={meeting.id}
        canEdit={canEdit}
        shareOrigin={shareOrigin}
        members={project.members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
        }))}
        initialValues={{
          title: meeting.title,
          type: meeting.type as (typeof MEETING_TYPES)[number],
          heldAt: meeting.heldAt,
          integrationId: meeting.integrationId,
          description: meeting.description,
          published: meeting.published,
          shareToken: meeting.shareToken,
          memberIds,
          guests,
        }}
      />
    </div>
  );
}
