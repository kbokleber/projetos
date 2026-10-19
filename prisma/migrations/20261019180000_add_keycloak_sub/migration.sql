-- AlterTable
ALTER TABLE "User" ADD COLUMN "keycloakSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_keycloakSub_key" ON "User"("keycloakSub");
