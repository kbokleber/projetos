import { signupSchema, resetPasswordSchema } from "../src/schemas/auth";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

console.log("\n🧪 Verificação dos schemas de auth\n");

// 1. Cadastro vazio → campos faltantes
const empty = signupSchema.safeParse({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  workspaceName: "",
  workspaceSlug: "",
});
check(
  "Todos os campos faltantes geram erros",
  !empty.success,
  empty.success ? "passou" : `${empty.error.issues.length} issues`,
);
const emptyErrs: Record<string, string> = {};
if (!empty.success) {
  for (const i of empty.error.issues) {
    const p = i.path.join(".");
    if (!emptyErrs[p]) emptyErrs[p] = i.message;
  }
}
check("Erro 'Informe o e-mail'", !!emptyErrs.email && emptyErrs.email.includes("Informe"), emptyErrs.email);
check("Erro 'Informe seu nome'", !!emptyErrs.name, emptyErrs.name);
check("Erro 'Informe a senha'", !!emptyErrs.password && emptyErrs.password.includes("Informe"), emptyErrs.password);
check("Erro 'Confirme a senha'", !!emptyErrs.confirmPassword && emptyErrs.confirmPassword.includes("Confirme"), emptyErrs.confirmPassword);
check(
  "Sem erro de 'não conferem' quando vazios",
  !emptyErrs.confirmPassword?.includes("não conferem"),
  emptyErrs.confirmPassword,
);

// 2. Senha curta → erro de tamanho
const short = signupSchema.safeParse({
  name: "Fulano",
  email: "fulano@example.com",
  password: "abc",
  confirmPassword: "abc",
  workspaceName: "Empresa",
  workspaceSlug: "",
});
const shortErrs: Record<string, string> = {};
if (!short.success) for (const i of short.error.issues) {
  const p = i.path.join(".");
  if (!shortErrs[p]) shortErrs[p] = i.message;
}
check(
  "Senha curta gera erro de tamanho",
  !!shortErrs.password?.includes("8 caracteres"),
  shortErrs.password,
);

// 3. Senhas diferentes
const diff = signupSchema.safeParse({
  name: "Fulano",
  email: "fulano@example.com",
  password: "senha-valida-123",
  confirmPassword: "outra-senha-123",
  workspaceName: "Empresa",
  workspaceSlug: "",
});
const diffErrs: Record<string, string> = {};
if (!diff.success) for (const i of diff.error.issues) {
  const p = i.path.join(".");
  if (!diffErrs[p]) diffErrs[p] = i.message;
}
check(
  "Senhas diferentes geram erro de 'não conferem'",
  !!diffErrs.confirmPassword?.includes("não conferem"),
  diffErrs.confirmPassword,
);

// 4. Slug opcional com caracteres inválidos
const badSlug = signupSchema.safeParse({
  name: "Fulano",
  email: "fulano@example.com",
  password: "senha-valida-123",
  confirmPassword: "senha-valida-123",
  workspaceName: "Empresa",
  workspaceSlug: "Slug Inválido!",
});
const slugErrs: Record<string, string> = {};
if (!badSlug.success) for (const i of badSlug.error.issues) {
  const p = i.path.join(".");
  if (!slugErrs[p]) slugErrs[p] = i.message;
}
check(
  "Slug inválido é rejeitado",
  !!slugErrs.workspaceSlug,
  slugErrs.workspaceSlug,
);

// 5. Tudo válido
const ok = signupSchema.safeParse({
  name: "Fulano",
  email: "fulano@example.com",
  password: "senha-valida-123",
  confirmPassword: "senha-valida-123",
  workspaceName: "Empresa",
  workspaceSlug: "",
});
check("Payload completo válido passa", ok.success);

// 6. Reset com senhas divergentes
const reset = resetPasswordSchema.safeParse({
  token: "x".repeat(40),
  password: "nova-senha-123",
  confirmPassword: "outra-senha-123",
});
const resetErrs: Record<string, string> = {};
if (!reset.success) for (const i of reset.error.issues) {
  const p = i.path.join(".");
  if (!resetErrs[p]) resetErrs[p] = i.message;
}
check(
  "Reset: senhas diferentes geram erro",
  !!resetErrs.confirmPassword?.includes("não conferem"),
  resetErrs.confirmPassword,
);

console.log(
  "\n" + (failures === 0 ? "✅ Schemas OK" : `❌ ${failures} falha(s)`),
);
process.exit(failures === 0 ? 0 : 1);
