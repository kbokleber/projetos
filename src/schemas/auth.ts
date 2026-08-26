import { z } from "zod";

const passwordField = z
  .string()
  .min(1, "Informe a senha")
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(128, "Senha muito longa");

const confirmPasswordField = z
  .string()
  .min(1, "Confirme a senha")
  .max(128, "Senha muito longa");

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Informe seu nome")
      .max(120, "Nome muito longo"),
    email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
    password: passwordField,
    confirmPassword: confirmPasswordField,
    workspaceName: z
      .string()
      .min(2, "Informe o nome do workspace")
      .max(80, "Nome muito longo"),
    workspaceSlug: z
      .string()
      .max(40, "Slug muito longo")
      .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "As senhas não conferem",
        path: ["confirmPassword"],
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "Token inválido"),
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "As senhas não conferem",
        path: ["confirmPassword"],
      });
    }
  });

export const adminCreateUserSchema = z
  .object({
    name: z
      .string()
      .min(2, "Informe o nome")
      .max(120, "Nome muito longo"),
    email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "As senhas não conferem",
        path: ["confirmPassword"],
      });
    }
  });

export const adminUpdateUserNameSchema = z.object({
  userId: z.string().min(1, "Usuário inválido"),
  name: z
    .string()
    .min(2, "Informe o nome")
    .max(120, "Nome muito longo"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserNameInput = z.infer<typeof adminUpdateUserNameSchema>;
