import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MeetingForm } from "@/features/meetings/meeting-form";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          members: {
            some: {
              userId: session.user.id,
              role: { in: ["OWNER", "ADMIN", "MEMBER"] },
            },
          },
        },
        {
          workspace: {
            is: { members: { some: { userId: session.user.id } } },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-1 pb-16 pt-2 md:px-2">
      <MeetingForm
        mode="create"
        projectId={project.id}
        projectName={project.name}
        canEdit
        members={project.members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
        }))}
      />
    </div>
  );
}
