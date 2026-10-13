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
