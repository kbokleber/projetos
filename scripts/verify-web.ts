import "dotenv/config";

const BASE = "http://localhost:3000";

async function login() {
  const csrf = await fetch(`${BASE}/api/auth/csrf`);
  const cookies = csrf.headers.getSetCookie();
  const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
  const csrfBody = (await csrf.json()) as { csrfToken: string };
  const formBody = new URLSearchParams({
    email: "admin@example.com",
    password: "Admin123!",
    csrfToken: csrfBody.csrfToken,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const cb = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: formBody,
    redirect: "manual",
  });
  const setCookies = cb.headers.getSetCookie();
  return [...cookies, ...setCookies]
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function get(path: string, cookies: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookies },
    redirect: "manual",
  });
  return res.status;
}

async function main() {
  const cookies = await login();
  // Acha um projeto do admin
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaLibSql } = await import("@prisma/adapter-libsql");
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  });
  const prisma = new PrismaClient({ adapter });
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("❌ sem projeto para testar");
    process.exit(1);
  }
  await prisma.$disconnect();

  const tests = [
    ["/dashboard", 200],
    ["/projects", 200],
    ["/projects/new", 200],
    [`/projects/${project.id}`, 200],
    [`/projects/${project.id}?tab=members`, 200],
    [`/projects/${project.id}?tab=overview`, 200],
    [`/projects/${project.id}/edit`, 200],
    ["/my-tasks", 200],
    ["/settings/api", 200],
    ["/settings/webhooks", 200],
    ["/api/openapi.json", 200],
    ["/api/docs", 200],
  ] as const;
  let failed = 0;
  for (const [path, expected] of tests) {
    const s = await get(path, cookies);
    const ok = s === expected;
    if (!ok) failed++;
    console.log(`${ok ? "✅" : "❌"} ${path} → ${s} (esperado ${expected})`);
  }
  console.log(
    failed === 0 ? "\n✅ Web smoke OK" : `\n❌ ${failed} rota(s) falharam.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
