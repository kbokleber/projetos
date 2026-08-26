import { redirect } from "next/navigation";

/** Busca unificada em /my-tasks (somente tarefas do usuário logado). */
export default async function TasksRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) qs.set(key, value);
  }
  const query = qs.toString();
  redirect(query ? `/my-tasks?${query}` : "/my-tasks");
}
