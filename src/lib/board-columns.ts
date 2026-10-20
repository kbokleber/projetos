import { isCompletionColumnName } from "@/lib/task-completion";

function normalizeColumnName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

/** Primeira etapa fixa do quadro — não pode ser criada, renomeada nem excluída. */
export function isFixedStartColumnName(name: string): boolean {
  return normalizeColumnName(name) === "a fazer";
}

/** A Fazer ou Concluído (e equivalentes) — etapas de sistema. */
export function isFixedSystemColumnName(name: string): boolean {
  return isFixedStartColumnName(name) || isCompletionColumnName(name);
}

export { isCompletionColumnName };
