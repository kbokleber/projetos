/**
 * Definições das views de tarefas (Grade / Quadro / …).
 * A navegação fica na barra superior da página do projeto.
 */
import {
  LayoutGrid,
  Columns3,
  GanttChart,
  CalendarDays,
  ChartColumn,
} from "lucide-react";
import type { TaskBoardView } from "@/features/tasks/task-view-types";

export const TASK_VIEW_NAV: Array<{
  key: TaskBoardView;
  label: string;
  Icon: React.ElementType;
}> = [
  { key: "board", label: "Quadro", Icon: Columns3 },
  { key: "grid", label: "Grade", Icon: LayoutGrid },
  { key: "timeline", label: "Linha do tempo", Icon: GanttChart },
  { key: "calendar", label: "Calendário", Icon: CalendarDays },
  { key: "charts", label: "Gráficos", Icon: ChartColumn },
];
