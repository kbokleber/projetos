import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { projectService } from "@/services/projects";
import { readLocalFile } from "@/lib/storage";
import { AppError } from "@/lib/errors";
import path from "node:path";

function mimeFromPath(relative: string) {
  const ext = path.extname(relative).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await ctx.params;
  try {
    const project = await projectService.getLogoForView(
      session.user.id,
      projectId,
    );
    const bytes = await readLocalFile(project.logoPath!);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeFromPath(project.logoPath!),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    console.error("[GET project logo]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
