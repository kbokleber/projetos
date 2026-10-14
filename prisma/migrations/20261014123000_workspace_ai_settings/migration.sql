-- CreateTable
CREATE TABLE "WorkspaceAiSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "baseUrl" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "apiKeyCiphertext" TEXT NOT NULL,
    "apiKeyLast4" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAiSettings_workspaceId_key" ON "WorkspaceAiSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceAiSettings_workspaceId_idx" ON "WorkspaceAiSettings"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceAiSettings" ADD CONSTRAINT "WorkspaceAiSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
