import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  let ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (!ws) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("Nenhum admin encontrado.");
    ws = await prisma.workspace.create({
      data: {
        name: "Workspace Principal",
        slug: "principal",
        description: "Workspace padrão",
        members: { create: { userId: admin.id, role: "OWNER" } },
      },
    });
    console.log("Workspace criado:", ws.id);
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of users) {
    const m = await prisma.workspaceMember.findFirst({ where: { userId: u.id } });
    if (!m) {
      await prisma.workspaceMember.create({
        data: { workspaceId: ws.id, userId: u.id, role: "MEMBER" },
      });
      console.log("Associado:", u.email);
    } else {
      console.log("OK:", u.email);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
