import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const p = new PrismaClient({ adapter });

async function main() {
  const tokens = await p.apiToken.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { email: true } } },
  });
  for (const t of tokens) {
    console.log({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      revokedAt: t.revokedAt,
      expiresAt: t.expiresAt,
      userEmail: t.user?.email,
      workspaceId: t.workspaceId,
    });
  }
  await p.$disconnect();
}
main();
