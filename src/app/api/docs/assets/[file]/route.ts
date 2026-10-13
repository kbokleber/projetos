import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED: Record<string, string> = {
  "swagger-ui.css": "text/css; charset=utf-8",
  "swagger-ui-bundle.js": "application/javascript; charset=utf-8",
  "swagger-ui-standalone-preset.js": "application/javascript; charset=utf-8",
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  const contentType = ALLOWED[file];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(
    process.cwd(),
    "node_modules",
    "swagger-ui-dist",
    file,
  );

  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Asset not found", { status: 404 });
  }
}
