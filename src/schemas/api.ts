import { z } from "zod";
import { POSITION_GAP } from "@/lib/constants";

const cuid = z.string().min(1);
const dateLike = z.string().datetime().or(z.string());

export const createProjectSchema = z.object({
  workspaceId: cuid.optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser #RRGGBB")
    .optional()
    .nullable(),
  icon: z.string().max(40).optional().nullable(),
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  startDate: dateLike.optional().nullable(),
  dueDate: dateLike.optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser #RRGGBB")
    .optional()
    .nullable(),
  icon: z.string().max(40).optional().nullable(),
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  startDate: dateLike.optional().nullable(),
  dueDate: dateLike.optional().nullable(),
  archived: z.boolean().optional(),
});

export const listProjectsQuerySchema = z.object({
  status: z
    .enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
    .optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(200).optional(),
});

export const projectParamsSchema = z.object({ projectId: cuid });

export const createBoardSchema = z.object({
  workspaceId: cuid.optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
});

export const boardParamsSchema = z.object({ boardId: cuid });

export const createColumnSchema = z.object({
  name: z.string().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  position: z.number().finite().default(POSITION_GAP),
});

export const columnParamsSchema = z.object({ columnId: cuid });

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
  position: z.number().finite().optional(),
});

export const listTasksQuerySchema = z.object({
  projectId: cuid.optional(),
  boardId: cuid.optional(),
  columnId: cuid.optional(),
  assigneeId: cuid.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  labelId: cuid.optional(),
  status: z.enum(["OPEN", "COMPLETED", "ARCHIVED"]).optional(),
  dueBefore: dateLike.optional(),
  dueAfter: dateLike.optional(),
  search: z.string().max(200).optional(),
  externalSource: z.string().max(60).optional(),
  externalId: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(200).optional(),
});

export const createTaskSchema = z.object({
  projectId: cuid,
  boardId: cuid,
  columnId: cuid,
  title: z.string().min(1).max(240),
  description: z.string().max(8000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: dateLike.optional().nullable(),
  dueDate: dateLike.optional().nullable(),
  estimatedHours: z.number().finite().nonnegative().optional().nullable(),
  position: z.number().finite().optional(),
  externalId: z.string().max(120).optional(),
  externalSource: z.string().max(60).optional(),
  assigneeIds: z.array(cuid).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(240).optional(),
  description: z.string().max(8000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: dateLike.optional().nullable(),
  dueDate: dateLike.optional().nullable(),
  estimatedHours: z.number().finite().nonnegative().optional().nullable(),
  columnId: cuid.optional(),
  position: z.number().finite().optional(),
  completed: z.boolean().optional(),
  archived: z.boolean().optional(),
  externalId: z.string().max(120).optional(),
  externalSource: z.string().max(60).optional(),
});

export const taskParamsSchema = z.object({ taskId: cuid });

export const moveTaskSchema = z.object({
  columnId: cuid,
  position: z.number().finite(),
});

export const addAssigneeSchema = z.object({
  userId: cuid,
});

export const taskAssigneeParamsSchema = z.object({
  taskId: cuid,
  userId: cuid,
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(8000),
});
