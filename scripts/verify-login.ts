import "dotenv/config";
import { authService } from "../src/services/auth";

async function main() {
  const u = await authService.verifyCredentials(
    "admin@example.com",
    "admin123",
  );
  if (!u) {
    console.log("INVALID credentials");
    process.exit(1);
  }
  console.log("OK", { id: u.id, email: u.email, role: u.role });
  await authService.ensureWorkspaceMembership(u.id);
  const ws = await authService.getActiveWorkspaces(u.id);
  console.log("workspaces", ws);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
