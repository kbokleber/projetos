import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

async function main() {
  const checks: Check[] = [];

  const [
    users,
    workspaces,
    workspaceMembers,
    projects,
    projectMembers,
    boards,
    columns,
    tasks,
    taskAssignees,
    labels,
    taskLabels,
    checklists,
    checklistItems,
    comments,
    activities,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.workspaceMember.count(),
    prisma.project.count(),
    prisma.projectMember.count(),
    prisma.board.count(),
    prisma.boardColumn.count(),
    prisma.task.count(),
    prisma.taskAssignee.count(),
    prisma.label.count(),
    prisma.taskLabel.count(),
    prisma.checklist.count(),
    prisma.checklistItem.count(),
    prisma.comment.count(),
    prisma.activity.count(),
  ]);

  checks.push(
    { name: "Users", ok: users >= 4, detail: `${users} encontrados` },
    {
      name: "Workspaces",
      ok: workspaces >= 1,
      detail: `${workspaces} encontrados`,
    },
    {
      name: "WorkspaceMembers",
      ok: workspaceMembers >= 4,
      detail: `${workspaceMembers} encontrados`,
    },
    { name: "Projects", ok: projects >= 3, detail: `${projects} encontrados` },
    {
      name: "ProjectMembers",
      ok: projectMembers >= 4,
      detail: `${projectMembers} encontrados`,
    },
    { name: "Boards", ok: boards >= 3, detail: `${boards} encontrados` },
    { name: "Columns", ok: columns >= 15, detail: `${columns} encontradas` },
    { name: "Tasks", ok: tasks >= 20, detail: `${tasks} encontradas` },
    {
      name: "TaskAssignees",
      ok: taskAssignees >= 20,
      detail: `${taskAssignees} encontrados`,
    },
    { name: "Labels", ok: labels >= 15, detail: `${labels} encontrados` },
    {
      name: "TaskLabels",
      ok: taskLabels >= 20,
      detail: `${taskLabels} encontrados`,
    },
    {
      name: "Checklists",
      ok: checklists >= 20,
      detail: `${checklists} encontrados`,
    },
    {
      name: "ChecklistItems",
      ok: checklistItems >= 80,
      detail: `${checklistItems} encontrados`,
    },
    {
      name: "Comments",
      ok: comments >= 10,
      detail: `${comments} encontrados`,
    },
    {
      name: "Activities",
      ok: activities >= 30,
      detail: `${activities} encontrados`,
    },
  );

  // Verificação de integridade: tarefa com projeto, board, coluna
  const sampleTask = await prisma.task.findFirst({
    include: { project: true, board: true, column: true, assignees: true },
  });
  checks.push({
    name: "Relacionamento Task→Project/Board/Column",
    ok: !!sampleTask && !!sampleTask.project && !!sampleTask.board && !!sampleTask.column,
    detail: sampleTask
      ? `task ${sampleTask.id} → ${sampleTask.project.name} / ${sampleTask.board.name} / ${sampleTask.column.name}`
      : "nenhuma tarefa encontrada",
  });

  // Verificação: tarefas por prioridade
  const byPriority = await prisma.task.groupBy({
    by: ["priority"],
    _count: { priority: true },
  });
  checks.push({
    name: "Tarefas com prioridade",
    ok: byPriority.length === 4,
    detail: `distribuídas em ${byPriority.length} prioridades`,
  });

  // Verificação: índices (checagem indireta via query explain não é viável aqui,
  // apenas garantimos que consultas indexadas rodam rápido)
  const t0 = Date.now();
  await prisma.task.findMany({
    where: { projectId: sampleTask?.projectId },
    orderBy: { position: "asc" },
  });
  const elapsed = Date.now() - t0;
  checks.push({
    name: "Consulta de tarefas por projeto",
    ok: elapsed < 200,
    detail: `${elapsed}ms`,
  });

  console.log("\n🔎 Verificação do banco de dados\n");
  console.log(
    "  " + "Check".padEnd(40) + "Status   Detalhe",
  );
  console.log("  " + "-".repeat(78));
  let allOk = true;
  for (const c of checks) {
    const status = c.ok ? "✅" : "❌";
    if (!c.ok) allOk = false;
    console.log(
      "  " + c.name.padEnd(40) + status + "       " + c.detail,
    );
  }

  console.log(
    "\n" +
      (allOk
        ? "✅ Todos os checks passaram."
        : "❌ Alguns checks falharam. Rode `npm run db:seed` para popular."),
  );
  process.exit(allOk ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
