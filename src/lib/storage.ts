import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
]);

function uploadsRoot() {
  return (
    process.env.STORAGE_LOCAL_DIR?.trim() ||
    path.join(process.cwd(), "uploads")
  );
}

function sanitizeFileName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()\[\]]+/g, "_");
  return base.slice(0, 180) || "arquivo";
}

export function assertAllowedUpload(file: {
  size: number;
  type: string;
  name: string;
}) {
  if (!file.size || file.size <= 0) {
    throw new Error("Arquivo vazio.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo maior que 15 MB.");
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(
      "Tipo de arquivo não permitido. Use imagens, PDF, Office, TXT, CSV ou ZIP.",
    );
  }
  return { mime, fileName: sanitizeFileName(file.name) };
}

export async function saveLocalFile(input: {
  workspaceId: string;
  taskId: string;
  fileName: string;
  bytes: Buffer;
}) {
  const token = randomBytes(8).toString("hex");
  const relative = path
    .join(input.workspaceId, input.taskId, `${token}-${input.fileName}`)
    .replace(/\\/g, "/");
  const absolute = path.join(uploadsRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.bytes);
  return { relative, absolute };
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const LOGO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function assertProjectLogoUpload(file: {
  size: number;
  type: string;
  name: string;
}) {
  if (!file.size || file.size <= 0) {
    throw new Error("Arquivo vazio.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error("Logo maior que 2 MB.");
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!LOGO_MIME.has(mime)) {
    throw new Error("Use imagem JPG, PNG, GIF ou WebP.");
  }
  return { mime, fileName: sanitizeFileName(file.name) };
}

export async function saveProjectLogoFile(input: {
  workspaceId: string;
  projectId: string;
  fileName: string;
  bytes: Buffer;
}) {
  const token = randomBytes(8).toString("hex");
  const relative = path
    .join(
      input.workspaceId,
      "projects",
      input.projectId,
      `logo-${token}-${input.fileName}`,
    )
    .replace(/\\/g, "/");
  const absolute = path.join(uploadsRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.bytes);
  return { relative, absolute };
}

export const projectLogoLimits = {
  maxBytes: LOGO_MAX_BYTES,
  allowedMime: [...LOGO_MIME],
};

export async function readLocalFile(relativePath: string) {
  const absolute = path.join(uploadsRoot(), relativePath);
  // Evita path traversal
  const root = path.resolve(uploadsRoot());
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Caminho inválido.");
  }
  return readFile(resolved);
}

export async function deleteLocalFile(relativePath: string) {
  try {
    const absolute = path.join(uploadsRoot(), relativePath);
    const root = path.resolve(uploadsRoot());
    const resolved = path.resolve(absolute);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) return;
    await unlink(resolved);
  } catch {
    // arquivo já ausente
  }
}

export const attachmentLimits = {
  maxBytes: MAX_BYTES,
  allowedMime: [...ALLOWED_MIME],
};
