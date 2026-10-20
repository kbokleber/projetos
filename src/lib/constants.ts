export const APP_NAME = "Projetos";

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

/** Rótulos em português para exibição na UI (valores no banco permanecem em inglês). */
export const PROJECT_STATUS_LABELS: Record<ProjectStatusValue, string> = {
  PLANNING: "Planejamento",
  ACTIVE: "Ativo",
  ON_HOLD: "Em espera",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export function projectStatusLabel(status: string): string {
  return (
    PROJECT_STATUS_LABELS[status as ProjectStatusValue] ?? status
  );
}

export const PROJECT_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const DEFAULT_BOARD_COLUMNS = [
  { name: "A Fazer", color: "#60a5fa", position: 1000 },
  { name: "Em Andamento", color: "#fbbf24", position: 2000 },
  { name: "Em Revisão", color: "#a78bfa", position: 3000 },
  { name: "Concluído", color: "#34d399", position: 4000 },
] as const;

export const API_SCOPES = [
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "meetings:read",
  "meetings:write",
  "comments:read",
  "comments:write",
  "members:read",
  "members:write",
  "webhooks:read",
  "webhooks:write",
] as const;

export const WEBHOOK_EVENTS = [
  "project.created",
  "project.updated",
  "task.created",
  "task.updated",
  "task.moved",
  "task.completed",
  "task.deleted",
  "comment.created",
  "member.added",
  "member.removed",
] as const;

/** Posição inicial espaçada para ordenação sem renumerar em massa */
export const POSITION_GAP = 1000;
