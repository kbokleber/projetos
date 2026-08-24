import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_BOARD_COLUMNS } from "../src/lib/constants";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida.");
}

const adapter = new PrismaPg({ connectionString: url });

const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

async function main() {
  console.log("🌱 Iniciando seed...");

  // Limpa dados existentes (ordem respeitando FKs)
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.serviceAccount.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.label.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      avatarUrl: null,
    },
  });

  const users = await Promise.all(
    [
      { name: "Maria Silva", email: "maria@example.com" },
      { name: "João Santos", email: "joao@example.com" },
      { name: "Ana Costa", email: "ana@example.com" },
    ].map(async (u) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash: await bcrypt.hash("password123", 12),
          role: "USER",
        },
      }),
    ),
  );

  const [maria, joao, ana] = users;

  const workspace = await prisma.workspace.create({
    data: {
      name: "Empresa Demo",
      slug: "empresa-demo",
      description: "Workspace de demonstração do sistema de projetos",
      members: {
        create: [
          { userId: admin.id, role: "OWNER" },
          { userId: maria.id, role: "ADMIN" },
          { userId: joao.id, role: "MEMBER" },
          { userId: ana.id, role: "MEMBER" },
        ],
      },
    },
  });

  const projectDefs = [
    {
      name: "Implantação ERP",
      description: "Projeto de implantação do novo ERP corporativo",
      color: "#2563eb",
      status: "ACTIVE" as const,
      icon: "briefcase",
    },
    {
      name: "Portal do Cliente",
      description: "Desenvolvimento do portal de autoatendimento",
      color: "#7c3aed",
      status: "ACTIVE" as const,
      icon: "globe",
    },
    {
      name: "Migração de Infraestrutura",
      description: "Migração de servidores para cloud",
      color: "#059669",
      status: "PLANNING" as const,
      icon: "server",
    },
  ];

  const labelDefs = [
    { name: "Bug", color: "#ef4444" },
    { name: "Melhoria", color: "#3b82f6" },
    { name: "Urgente", color: "#f97316" },
    { name: "Backend", color: "#8b5cf6" },
    { name: "Frontend", color: "#06b6d4" },
    { name: "Infraestrutura", color: "#64748b" },
  ];

  const taskTitles = [
    "Configurar servidor",
    "Criar endpoints da API",
    "Implementar autenticação",
    "Desenhar wireframes",
    "Configurar CI/CD",
    "Migrar banco de dados",
    "Escrever documentação",
    "Testes de integração",
    "Revisar segurança",
    "Deploy em staging",
  ];

  let taskCount = 0;

  for (const def of projectDefs) {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: def.name,
        description: def.description,
        color: def.color,
        icon: def.icon,
        status: def.status,
        createdBy: admin.id,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        members: {
          create: [
            { userId: admin.id, role: "OWNER" },
            { userId: maria.id, role: "ADMIN" },
            { userId: joao.id, role: "MEMBER" },
            { userId: ana.id, role: "VIEWER" },
          ],
        },
      },
    });

    const labels = await Promise.all(
      labelDefs.map((l) =>
        prisma.label.create({
          data: { projectId: project.id, name: l.name, color: l.color },
        }),
      ),
    );

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: "Board Principal",
        description: `Quadro Kanban de ${def.name}`,
      },
    });

    const columns = await Promise.all(
      DEFAULT_BOARD_COLUMNS.map((col) =>
        prisma.boardColumn.create({
          data: {
            boardId: board.id,
            name: col.name,
            color: col.color,
            position: col.position,
          },
        }),
      ),
    );

    for (let i = 0; i < taskTitles.length; i++) {
      const column = columns[i % columns.length];
      const priority =
        i % 4 === 0
          ? ("URGENT" as const)
          : i % 3 === 0
            ? ("HIGH" as const)
            : i % 2 === 0
              ? ("MEDIUM" as const)
              : ("LOW" as const);

      const isDone = column.name === "Concluído";
      const dueOffset = (i - 3) * 24 * 60 * 60 * 1000;

      const task = await prisma.task.create({
        data: {
          boardId: board.id,
          columnId: column.id,
          projectId: project.id,
          title: `${taskTitles[i]} — ${def.name.split(" ")[0]}`,
          description: `Descrição detalhada da tarefa: ${taskTitles[i]}`,
          position: (i + 1) * 1000,
          priority,
          createdBy: admin.id,
          dueDate: new Date(Date.now() + dueOffset),
          completedAt: isDone ? new Date() : null,
          estimatedHours: 2 + (i % 8),
        },
      });

      taskCount++;

      // Responsáveis
      const assignees = [admin, maria, joao].slice(0, (i % 3) + 1);
      for (const user of assignees) {
        await prisma.taskAssignee.create({
          data: { taskId: task.id, userId: user.id },
        });
      }

      // Etiquetas
      const taskLabels = labels.slice(0, (i % 3) + 1);
      for (const label of taskLabels) {
        await prisma.taskLabel.create({
          data: { taskId: task.id, labelId: label.id },
        });
      }

      // Checklist
      const checklist = await prisma.checklist.create({
        data: {
          taskId: task.id,
          title: "Checklist",
          position: 1000,
        },
      });

      const checklistItems = [
        "Analisar requisitos",
        "Implementar solução",
        "Revisar código",
        "Testar",
        "Documentar",
      ];

      for (let j = 0; j < checklistItems.length; j++) {
        const completed = j < (i % 5);
        await prisma.checklistItem.create({
          data: {
            checklistId: checklist.id,
            description: checklistItems[j],
            position: (j + 1) * 1000,
            completed,
            completedAt: completed ? new Date() : null,
            completedBy: completed ? admin.id : null,
          },
        });
      }

      // Comentários
      if (i % 2 === 0) {
        await prisma.comment.create({
          data: {
            taskId: task.id,
            userId: maria.id,
            content: "Iniciando trabalho nesta tarefa.",
          },
        });
        await prisma.comment.create({
          data: {
            taskId: task.id,
            userId: joao.id,
            content: "Preciso de mais detalhes sobre o escopo.",
          },
        });
      }

      await prisma.activity.create({
        data: {
          workspaceId: workspace.id,
          projectId: project.id,
          taskId: task.id,
          userId: admin.id,
          actorType: "USER",
          actorId: admin.id,
          action: "task.created",
          entityType: "Task",
          entityId: task.id,
          metadata: JSON.stringify({ title: task.title }),
        },
      });
    }

    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        userId: admin.id,
        actorType: "USER",
        actorId: admin.id,
        action: "project.created",
        entityType: "Project",
        entityId: project.id,
        metadata: JSON.stringify({ name: project.name }),
      },
    });
  }

  console.log("✅ Seed concluído!");
  console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Usuários: maria@example.com, joao@example.com, ana@example.com (senha: password123)`);
  console.log(`   Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`   Projetos: ${projectDefs.length}`);
  console.log(`   Tarefas: ${taskCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
