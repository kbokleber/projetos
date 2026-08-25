import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    select: {
      id: true,
      name: true,
      _count: { select: { tasks: { where: { archivedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });
  console.log("--- Projetos ativos ---");
  for (const p of projects) {
    console.log(`- ${p.name} (${p._count.tasks} tarefas)  id=${p.id}`);
  }
  console.log(`Total: ${projects.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
