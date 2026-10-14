/**
 * Importa texto/transcrição e extrai rascunho de ATA via LLM.
 */

import { AppError } from "@/lib/errors";
import { chatJson } from "@/lib/llm";
import { sanitizeMeetingHtml } from "@/lib/sanitize-html";
import {
  importMeetingAiResultSchema,
  importMeetingTextSchema,
  type ImportMeetingAiResult,
} from "@/schemas/meetings";
import { assertProjectAccess } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";
import { workspaceAiService } from "@/services/workspace-ai";

export type MeetingImportDraft = {
  title: string;
  type: ImportMeetingAiResult["type"];
  heldAt: string;
  descriptionHtml: string;
  memberIds: string[];
  guests: string[];
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchParticipants(
  names: string[],
  members: Array<{ userId: string; name: string | null; email: string }>,
) {
  const memberIds = new Set<string>();
  const guests: string[] = [];

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const n = normalizeName(name);
    if (!n) continue;

    const hit = members.find((m) => {
      const full = normalizeName(m.name ?? "");
      const email = normalizeName(m.email);
      const emailLocal = email.split("@")[0] ?? "";
      if (full && (full === n || full.includes(n) || n.includes(full))) {
        return true;
      }
      if (email && (email === n || emailLocal === n)) return true;
      // Match por primeiro nome quando único
      const first = full.split(" ")[0] ?? "";
      if (first && first.length >= 3 && (first === n || n.startsWith(first))) {
        const sameFirst = members.filter((x) =>
          normalizeName(x.name ?? "").startsWith(first),
        );
        return sameFirst.length === 1;
      }
      return false;
    });

    if (hit) memberIds.add(hit.userId);
    else guests.push(name);
  }

  return {
    memberIds: Array.from(memberIds),
    guests: Array.from(new Set(guests)),
  };
}

function toDatetimeLocalValue(isoLike: string): string {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) {
    // tenta datetime-local já válido
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(isoLike)) {
      return isoLike.slice(0, 16);
    }
    throw new AppError(
      "VALIDATION_ERROR",
      "Não foi possível interpretar a data da reunião.",
      400,
    );
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plainToHtmlFallback(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export const meetingImportService = {
  async extractDraft(
    userId: string,
    projectId: string,
    rawText: string,
  ): Promise<MeetingImportDraft> {
    await assertProjectAccess(userId, projectId, "edit");

    const parsedText = importMeetingTextSchema.safeParse({ text: rawText });
    if (!parsedText.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsedText.error.issues[0]?.message ?? "Texto inválido.",
        400,
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!project) {
      throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    }

    const llmConfig = await workspaceAiService.getLlmConfigForWorkspace(
      project.workspaceId,
    );

    const memberOptions = project.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
    }));

    const memberList = memberOptions
      .map((m) => `- ${m.name ?? "(sem nome)"} <${m.email}>`)
      .join("\n");

    const nowIso = new Date().toISOString();
    const system = `Você extrai dados de atas/reuniões a partir de transcrições ou notas em português.
Responda APENAS um único objeto JSON válido (sem markdown, sem blocos \`\`\`, sem explicações).
Chaves obrigatórias:
- title (string)
- type: "ATA" | "DAILY" | "HANDS_ON"
- heldAt: data/hora ISO 8601 da reunião (se não houver, use ${nowIso})
- descriptionHtml: HTML simples (p, ul, ol, li, h2, h3, strong, em, br) com resumo estruturado da reunião (pauta, decisões, ações). Não use script/iframe.
- participantNames: array de nomes mencionados como participantes

Projeto atual: ${project.name}
Membros do projeto (prefira estes nomes quando houver correspondência):
${memberList || "(nenhum)"}

Se o texto for Daily, use type DAILY; Hands On / workshop use HANDS_ON; caso contrário ATA.
Não invente participantes que não apareçam no texto.`;

    const raw = await chatJson(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Texto da reunião:\n\n${parsedText.data.text}`,
        },
      ],
      llmConfig,
    );

    const ai = importMeetingAiResultSchema.safeParse(raw);
    if (!ai.success) {
      throw new AppError(
        "UPSTREAM_ERROR",
        "Não foi possível interpretar a resposta da IA. Tente de novo com um texto mais claro.",
        502,
      );
    }

    const heldAt = toDatetimeLocalValue(ai.data.heldAt);
    let descriptionHtml = sanitizeMeetingHtml(ai.data.descriptionHtml || "");
    if (!descriptionHtml.replace(/<[^>]+>/g, "").trim()) {
      descriptionHtml = plainToHtmlFallback(
        parsedText.data.text.slice(0, 8000),
      );
    }

    const matched = matchParticipants(ai.data.participantNames, memberOptions);

    return {
      title: ai.data.title.slice(0, 200),
      type: ai.data.type,
      heldAt,
      descriptionHtml,
      memberIds: matched.memberIds,
      guests: matched.guests,
    };
  },
};
