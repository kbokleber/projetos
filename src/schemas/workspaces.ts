import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Informe o nome do workspace")
    .max(80, "Nome muito longo"),
  slug: z
    .string()
    .max(40, "Slug muito longo")
    .regex(
      /^[a-z0-9-]*$/,
      "Use apenas letras minúsculas, números e hífen",
    )
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .max(500, "Descrição muito longa")
    .optional()
    .or(z.literal("")),
});

export const addWorkspaceMemberSchema = z.object({
  workspaceId: z.string().min(1, "Workspace inválido"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
