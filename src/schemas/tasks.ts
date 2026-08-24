import { z } from "zod";
import { TASK_PRIORITIES } from "@/lib/constants";

const dateLike = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Data inválida" })
  .optional()
  .or(z.literal("").transform(() => undefined));

export const taskQuickSchema = z.object({
  projectId: z.string().min(1),
  boardId: z.string().min(1),
  columnId: z.string().min(1),
  title: z.string().min(1, "Informe o título").max(240),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  dueDate: dateLike,
});

export type TaskQuickValues = z.infer<typeof taskQuickSchema>;

export const taskFullSchema = z.object({
  title: z.string().min(1, "Informe o título").max(240),
  description: z.string().max(8000).optional(),
  priority: z.enum(TASK_PRIORITIES),
  startDate: dateLike,
  dueDate: dateLike,
  estimatedHours: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0), {
      message: "Estimativa inválida",
    }),
  assigneeIds: z.array(z.string()).optional(),
});

export type TaskFullValues = z.infer<typeof taskFullSchema>;

export const commentCreateSchema = z.object({
  content: z.string().min(1, "Comentário vazio").max(8000),
});
