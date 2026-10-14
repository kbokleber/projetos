import { z } from "zod";

export const MEETING_TYPES = ["ATA", "DAILY", "HANDS_ON"] as const;

export const meetingFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  type: z.enum(MEETING_TYPES),
  heldAt: z.string().min(1, "Informe data e hora."),
  integrationId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z.string().max(500_000).default(""),
  published: z.boolean().default(false),
  memberIds: z.array(z.string().min(1)).default([]),
  guests: z
    .array(z.string().trim().min(1).max(120))
    .default([])
    .transform((arr) =>
      Array.from(new Set(arr.map((g) => g.trim()).filter(Boolean))),
    ),
});

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

/** Resultado estruturado da IA ao importar texto de reunião. */
export const importMeetingAiResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(MEETING_TYPES).default("ATA"),
  heldAt: z.string().min(1),
  descriptionHtml: z.string().max(500_000).default(""),
  participantNames: z.array(z.string().trim().min(1).max(120)).default([]),
});

export type ImportMeetingAiResult = z.infer<typeof importMeetingAiResultSchema>;

export const importMeetingTextSchema = z.object({
  text: z
    .string()
    .trim()
    .min(40, "Cole um texto maior (transcrição ou notas da reunião).")
    .max(150_000, "Texto muito longo (máx. 150.000 caracteres)."),
});
