/**
 * Colunas que representam conclusão no board (ex.: "Concluído", "Done").
 * Tarefas nelas contam como concluídas no dashboard, mesmo sem completedAt.
 */
export function isCompletionColumnName(name: string): boolean {
  const n = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  return (
    n === "concluido" ||
    n === "done" ||
    n === "completed" ||
    n === "complete" ||
    n === "finalizado" ||
    n === "fechado" ||
    n.startsWith("conclu")
  );
}
