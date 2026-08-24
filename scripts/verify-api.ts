import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000/api/v1";

type JsonResponse = {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string };
};

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  const status = ok ? "✅" : "❌";
  if (!ok) failures++;
  console.log(`  ${status} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function http(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
  tokenOverride?: string,
): Promise<{ status: number; data: JsonResponse; headers: Headers }> {
  const token =
    tokenOverride !== undefined
      ? tokenOverride
      : ((globalThis as { __SMOKE_TOKEN?: string }).__SMOKE_TOKEN ?? process.env.SMOKE_TOKEN ?? "");
  if (token === undefined) throw new Error("SMOKE_TOKEN ausente");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as JsonResponse;
  return { status: res.status, data, headers: res.headers };
}

async function setupToken() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  if (!admin) throw new Error("admin não existe — rode db:seed");
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: admin.id },
  });
  if (!member) throw new Error("admin sem workspace");

  // Gera token manualmente para o smoke
  const raw = "pk_live_smoke" + randomBytes(20).toString("hex");
  const prefix = raw.slice(0, 12); // TOKEN_PREFIX (8) + 4 do payload
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const token = await prisma.apiToken.create({
    data: {
      workspaceId: member.workspaceId,
      userId: admin.id,
      name: "Smoke Verify",
      prefix,
      tokenHash,
      scopes: JSON.stringify([
        "projects:read",
        "projects:write",
        "tasks:read",
        "tasks:write",
        "comments:read",
        "comments:write",
      ]),
    },
  });
  console.log("   token.id:", token.id);
  console.log("   prefix salvo:", prefix);
  console.log("   workspaceId:", member.workspaceId);

  // Confirma leitura pelo mesmo cliente
  const found = await prisma.apiToken.findFirst({
    where: { prefix, revokedAt: null },
  });
  console.log("   re-leitura cliente:", found ? "OK" : "FALHOU");
  if (!found) {
    const all = await prisma.apiToken.count();
    console.log("   total de tokens no DB:", all);
  }

  process.env.SMOKE_TOKEN = raw;
  // Hack: como `fetch` lê process.env a cada chamada, mas o script está todo
  // dentro do mesmo módulo, isso basta.
  (globalThis as { __SMOKE_TOKEN?: string }).__SMOKE_TOKEN = raw;
  process.env.SMOKE_WORKSPACE_ID = member.workspaceId;

  // Pega o primeiro projeto/board/coluna/usuário para os testes
  const project = await prisma.project.findFirst({
    where: { workspaceId: member.workspaceId },
    include: { boards: { include: { columns: true } } },
  });
  if (!project) throw new Error("sem projeto");
  process.env.SMOKE_PROJECT_ID = project.id;
  process.env.SMOKE_BOARD_ID = project.boards[0].id;
  process.env.SMOKE_COLUMN_ID = project.boards[0].columns[0].id;
  process.env.SMOKE_USER_ID = (
    await prisma.workspaceMember.findFirst({
      where: { workspaceId: member.workspaceId, userId: { not: admin.id } },
    })
  )!.userId;

  console.log(`   token criado: ${raw.slice(0, 14)}…`);
  return token.id;
}

async function cleanup(tokenId: string) {
  await prisma.apiToken.delete({ where: { id: tokenId } }).catch(() => {});
  // Remove tasks de teste
  await prisma.task.deleteMany({
    where: {
      OR: [
        { externalSource: "SMOKE" },
        { title: { contains: "smoke" } },
      ],
    },
  });
}

async function main() {
  console.log("\n🔌 Verificação da API v1\n");

  const tokenId = await setupToken();

  try {
    // 1. Auth
    const noAuth = await http("GET", "/projects", undefined, undefined, "");
    check("401 sem Authorization", noAuth.status === 401);

    // 2. Listar projetos
    const projects = await http("GET", "/projects?limit=5");
    check(
      "GET /projects com Bearer",
      projects.status === 200,
      `status ${projects.status}`,
    );
    if (projects.status !== 200) {
      console.log("   ↳ resposta:", JSON.stringify(projects.data).slice(0, 200));
    }

    // 3. Detalhe
    const projectId = process.env.SMOKE_PROJECT_ID!;
    const detail = await http("GET", `/projects/${projectId}`);
    check("GET /projects/{id}", detail.status === 200);

    // 4. Listar tasks
    const tasks = await http("GET", `/tasks?projectId=${projectId}&limit=5`);
    check(
      "GET /tasks com filtros",
      tasks.status === 200,
      `status ${tasks.status}`,
    );

    // 5. Criar/editar/mover/comentar/deletar task
    const create = await http(
      "POST",
      "/tasks",
      {
        projectId,
        boardId: process.env.SMOKE_BOARD_ID,
        columnId: process.env.SMOKE_COLUMN_ID,
        title: "Smoke task",
        priority: "HIGH",
        externalSource: "SMOKE",
        externalId: `smoke-${Date.now()}`,
      },
      { "Idempotency-Key": `smoke-${Date.now()}` },
    );
    const taskId = (create.data.data as { id: string }).id;
    check("POST /tasks com Idempotency-Key", create.status === 201 && !!taskId);

    if (taskId) {
      const patch = await http("PATCH", `/tasks/${taskId}`, { priority: "URGENT" });
      check("PATCH /tasks/{id}", patch.status === 200);

      const move = await http("POST", `/tasks/${taskId}/move`, {
        columnId: process.env.SMOKE_COLUMN_ID,
        position: 9999,
      });
      check("POST /tasks/{id}/move", move.status === 200);

      const assign = await http("POST", `/tasks/${taskId}/assignees`, {
        userId: process.env.SMOKE_USER_ID,
      });
      check("POST /tasks/{id}/assignees", assign.status === 201);

      const comment = await http("POST", `/tasks/${taskId}/comments`, {
        content: "Comentário smoke",
      });
      check("POST /tasks/{id}/comments", comment.status === 201);

      const del = await http("DELETE", `/tasks/${taskId}`);
      check("DELETE /tasks/{id}", del.status === 204);
    }

    // 6. Scope insuficiente
    const lowScope = await http("GET", "/projects");
    check("X-RateLimit-Limit presente", !!lowScope.headers.get("X-RateLimit-Limit"));

    // 7. OpenAPI
    const spec = await fetch("http://localhost:3000/api/openapi.json");
    check("GET /api/openapi.json", spec.status === 200);

    // 8. Webhook de teste (criando webhook efêmero)
    const webhookUrl = "http://127.0.0.1:54321/webhook-test";
    const { webhookService } = await import("../src/services/webhooks");
    const wh = await prisma.webhook.create({
      data: {
        workspaceId: process.env.SMOKE_WORKSPACE_ID!,
        name: "Smoke webhook",
        url: webhookUrl,
        secret: "whsec_smoke",
        events: JSON.stringify(["task.created"]),
        active: true,
      },
    });

    // Dispara evento — vai falhar na entrega (sem servidor), mas a entrega é persistida
    await webhookService.dispatch(
      process.env.SMOKE_WORKSPACE_ID!,
      "task.created",
      { hello: "world" },
    );

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: wh.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    check(
      "Webhook delivery persistida",
      deliveries.length === 1 && deliveries[0].event === "task.created",
    );
  } finally {
    await cleanup(tokenId);
  }

  console.log(
    "\n" +
      (failures === 0
        ? "✅ API smoke OK"
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
