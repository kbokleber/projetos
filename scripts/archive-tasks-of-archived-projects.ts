import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const archivedProjects = await prisma.project.findMany({
    where: { archivedAt: { not: null } },
    select: { id: true, name: true },
  });
  let total = 0;
  for (const p of archivedProjects) {
    const r = await prisma.task.updateMany({
      where: { projectId: p.id, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (r.count > 0) console.log(`${p.name}: ${r.count} tarefas arquivadas`);
    total += r.count;
  }
  console.log(`Total tarefas arquivadas agora: ${total}`);
}

main().finally(() => prisma.$disconnect());
