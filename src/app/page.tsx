import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  // Import dinâmico para evitar ciclo entre Home e /login durante a build
  const { default: GuestHome } = await import("./guest-home");
  return <GuestHome />;
}
