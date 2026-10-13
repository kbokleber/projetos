import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { attachmentService } from "@/services/attachments";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { attachmentId } = await ctx.params;
  try {
    const { attachment, bytes } = await attachmentService.getForDownload(
      session.user.id,
      attachmentId,
    );
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[GET attachment]", err);
    return NextResponse.json({ error: "Erro ao baixar." }, { status: 500 });
  }
}
