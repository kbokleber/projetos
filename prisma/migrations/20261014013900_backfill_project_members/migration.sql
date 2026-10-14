-- Backfill: vincula membros do workspace aos projetos existentes
-- sem sobrescrever ProjectMember já cadastrado.
-- Workspace OWNER/ADMIN -> Project ADMIN; demais -> Project MEMBER.

INSERT INTO "ProjectMember" ("id", "projectId", "userId", "role", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || p."id" || wm."userId"),
  p."id",
  wm."userId",
  CASE
    WHEN wm."role" IN ('OWNER', 'ADMIN') THEN 'ADMIN'::"ProjectRole"
    ELSE 'MEMBER'::"ProjectRole"
  END,
  NOW()
FROM "Project" p
INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProjectMember" pm
  WHERE pm."projectId" = p."id"
    AND pm."userId" = wm."userId"
);
