import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  if (!admin) throw new Error("admin não existe");
  const member = await prisma.workspaceMember.findFirst({ where: { userId: admin.id } });
  if (!member) throw new Error("admin sem workspace");

  const body = randomBytes(20).toString("hex");
  const raw = "pk_live_" + body;
  const prefix = raw.slice(0, 9);
  const tokenHash = createHash("sha256").update(raw).digest("hex");

  const created = await prisma.apiToken.create({
    data: {
      workspaceId: member.workspaceId,
      userId: admin.id,
      name: "Direct test",
      prefix,
      tokenHash,
      scopes: JSON.stringify(["projects:read"]),
    },
  });
  console.log("token:", raw);
  console.log("prefix armazenado:", prefix);
  console.log("hash armazenado:", tokenHash);

  // Simula authenticateRequest
  const found = await prisma.apiToken.findFirst({
    where: { prefix, revokedAt: null },
  });
  console.log("found by prefix:", found ? "sim" : "não");
  if (found) {
    console.log("hash encontrado:  ", found.tokenHash);
    console.log("hash calculado:   ", tokenHash);
    console.log("match:", found.tokenHash === tokenHash);
  }

  // Limpa
  await prisma.apiToken.delete({ where: { id: created.id } });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
