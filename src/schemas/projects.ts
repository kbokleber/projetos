import { z } from "zod";

const hex = /^#[0-9a-fA-F]{6}$/;
const dateLike = z.string().min(1).refine(
  (v) => !Number.isNaN(new Date(v).getTime()),
  { message: "Data inválida" },
);

export const projectFormSchema = z.object({
  workspaceId: z.string().min(1, "Selecione um workspace"),
  name: z.string().min(1, "Informe o nome").max(120, "Nome muito longo"),
  description: z.string().max(2000, "Descrição muito longa").optional(),
  color: z
    .string()
    .regex(hex, "Cor deve ser #RRGGBB")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  icon: z
    .string()
    .max(40, "Ícone muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .default("ACTIVE"),
  startDate: dateLike.optional().or(z.literal("").transform(() => undefined)),
  dueDate: dateLike.optional().or(z.literal("").transform(() => undefined)),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const addMemberSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export type AddMemberValues = z.infer<typeof addMemberSchema>;
