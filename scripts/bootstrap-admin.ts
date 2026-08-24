/**
 * Cria o primeiro admin se o banco estiver vazio.
 * Seguro para produção: não apaga dados existentes.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida.");
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = (
  process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"
).toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`[bootstrap] Já existem ${count} usuário(s) — nada a fazer.`);
    return;
  }

  console.log(`[bootstrap] Banco vazio — criando admin ${ADMIN_EMAIL}...`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Workspace Principal",
      slug: "principal",
      description: "Workspace inicial",
      members: {
        create: [{ userId: admin.id, role: "OWNER" }],
      },
    },
  });

  console.log(`[bootstrap] Admin criado: ${admin.email}`);
  console.log(`[bootstrap] Workspace: ${workspace.name} (${workspace.slug})`);
}

main()
  .catch((e) => {
    console.error("[bootstrap] Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
