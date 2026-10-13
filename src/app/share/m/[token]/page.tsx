import { notFound } from "next/navigation";
import { meetingService } from "@/services/meetings";
import { AppError } from "@/lib/errors";
import { dateTimeBR } from "@/lib/format-date";
import { sanitizeMeetingHtml } from "@/lib/sanitize-html";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  ATA: "ATA",
  DAILY: "Daily",
  HANDS_ON: "Hands On",
};

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let meeting;
  try {
    meeting = await meetingService.getByShareToken(token);
  } catch (err) {
    if (err instanceof AppError) notFound();
    throw err;
  }

  const participants = meeting.participants.map((p) =>
    p.user ? (p.user.name ?? p.user.email) : (p.guestName ?? "—"),
  );

  const safeHtml = sanitizeMeetingHtml(meeting.description);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {APP_NAME} · reunião compartilhada
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {meeting.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {meeting.project.name} · {TYPE_LABELS[meeting.type] ?? meeting.type} ·{" "}
          {dateTimeBR(meeting.heldAt)}
        </p>

        {participants.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium">Participantes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {participants.join(", ")}
            </p>
          </section>
        )}

        <section className="mt-8 border-t border-border pt-6">
          {safeHtml && safeHtml !== "<p></p>" ? (
            <div
              className="prose-meeting text-sm"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem descrição registrada.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
