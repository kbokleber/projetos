import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  const status = ok ? "✅" : "❌";
  if (!ok) failures++;
  console.log(`  ${status} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n🔐 Verificação do fluxo de autenticação\n");

  // 1. Admin existe
  const admin = await prisma.user.findUnique({
    where: { email: "admin@example.com" },
  });
  check("Usuário admin existe", !!admin, admin?.email);

  // 2. Senha do admin bate
  if (admin?.passwordHash) {
    const ok = await bcrypt.compare("admin123", admin.passwordHash);
    check("Senha admin123 confere com hash", ok);
  } else {
    check("Senha admin123 confere com hash", false, "sem hash");
  }

  // 3. Cria usuário de teste e tenta autenticar
  const testEmail = `smoke-${Date.now()}@example.com`;
  const passwordHash = await bcrypt.hash("senha-teste-123", 12);

  await prisma.user.deleteMany({ where: { email: testEmail } });
  const created = await prisma.user.create({
    data: { name: "Smoke Test", email: testEmail, passwordHash },
  });
  check("Criação de usuário", !!created, created.id);

  const fetched = await prisma.user.findUnique({ where: { email: testEmail } });
  const passOk = fetched
    ? await bcrypt.compare("senha-teste-123", fetched.passwordHash ?? "")
    : false;
  check("Autenticação (compare) sucesso", passOk);

  const wrongOk = fetched
    ? await bcrypt.compare("errada", fetched.passwordHash ?? "")
    : false;
  check("Autenticação com senha errada falha", !wrongOk);

  // 4. Workspace criado no signup
  const ws = await prisma.workspace.create({
    data: {
      name: "Workspace Smoke",
      slug: `ws-smoke-${Date.now()}`,
      members: { create: { userId: created.id, role: "OWNER" } },
    },
  });
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: created.id },
  });
  check("OWNER do workspace criado", member?.role === "OWNER", ws.slug);

  // 5. Password reset token
  const { createHash, randomBytes } = await import("node:crypto");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: created.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  const found = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
  check("Token de recuperação válido e encontrável", !!found);

  // 6. Atualização de senha
  const newHash = await bcrypt.hash("nova-senha-456", 12);
  await prisma.user.update({
    where: { id: created.id },
    data: { passwordHash: newHash },
  });
  const refreshed = await prisma.user.findUnique({ where: { id: created.id } });
  const newPassOk = refreshed
    ? await bcrypt.compare("nova-senha-456", refreshed.passwordHash ?? "")
    : false;
  check("Nova senha é persistida e verificável", newPassOk);

  // 7. keycloakSub (coluna SSO) — vínculo e unicidade
  const fakeSub = `kc-smoke-${Date.now()}`;
  await prisma.user.update({
    where: { id: created.id },
    data: { keycloakSub: fakeSub },
  });
  const bySub = await prisma.user.findUnique({ where: { keycloakSub: fakeSub } });
  check("keycloakSub gravado e consultável", bySub?.id === created.id, fakeSub);

  const byEmailInsensitive = await prisma.user.findFirst({
    where: {
      email: { equals: testEmail.toUpperCase(), mode: "insensitive" },
    },
  });
  check(
    "Busca de e-mail case-insensitive",
    byEmailInsensitive?.id === created.id,
  );

  // 8. Limpeza
  await prisma.passwordResetToken.deleteMany({ where: { userId: created.id } });
  await prisma.workspaceMember.deleteMany({ where: { userId: created.id } });
  await prisma.workspace.delete({ where: { id: ws.id } });
  await prisma.user.delete({ where: { id: created.id } });
  check("Limpeza dos dados de teste", true);

  const keycloakConfigured = Boolean(
    process.env.AUTH_KEYCLOAK_ID &&
      process.env.AUTH_KEYCLOAK_SECRET &&
      process.env.AUTH_KEYCLOAK_ISSUER,
  );
  console.log(
    `\n  ℹ️  Keycloak configurado: ${keycloakConfigured ? "sim" : "não (só legado)"}`,
  );
  console.log(
    `  ℹ️  LEGACY_LOGIN_ENABLED: ${process.env.LEGACY_LOGIN_ENABLED ?? "(não definido)"}`,
  );

  console.log(
    "\n" +
      (failures === 0
        ? "✅ Todos os fluxos de autenticação passaram."
        : `❌ ${failures} verificação(ões) falharam.`),
  );
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
