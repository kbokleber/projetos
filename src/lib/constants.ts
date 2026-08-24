export const APP_NAME = "Projetos";

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

export const PROJECT_ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const DEFAULT_BOARD_COLUMNS = [
  { name: "Backlog", color: "#94a3b8", position: 1000 },
  { name: "A Fazer", color: "#60a5fa", position: 2000 },
  { name: "Em Andamento", color: "#fbbf24", position: 3000 },
  { name: "Em Revisão", color: "#a78bfa", position: 4000 },
  { name: "Concluído", color: "#34d399", position: 5000 },
] as const;

export const API_SCOPES = [
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "comments:read",
  "comments:write",
  "members:read",
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
