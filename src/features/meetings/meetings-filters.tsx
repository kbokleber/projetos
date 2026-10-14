import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MEETING_TYPES } from "@/schemas/meetings";
import { Search, X } from "lucide-react";

export type MeetingsFilterValues = {
  q: string;
  type: string;
  from: string;
  to: string;
  published: string;
  integrationId: string;
};

const TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  ATA: "ATA",
  DAILY: "Daily",
  HANDS_ON: "Hands On",
};

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function MeetingsFilters({
  projectId,
  values,
  hasActiveFilters,
}: {
  projectId: string;
  values: MeetingsFilterValues;
  hasActiveFilters: boolean;
}) {
  return (
    <form
      method="get"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Pesquisar ATAs</p>
        {hasActiveFilters ? (
          <Button asChild variant="ghost" size="sm" type="button">
            <Link href={`/projects/${projectId}/meetings`}>
              <X className="size-3.5" />
              Limpar
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="meetings-q" className="text-xs font-medium">
            Título / descrição
          </label>
          <input
            id="meetings-q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder="Buscar texto…"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="meetings-type" className="text-xs font-medium">
            Tipo
          </label>
          <select
            id="meetings-type"
            name="type"
            defaultValue={values.type}
            className={inputClass}
          >
            <option value="">Todos</option>
            {MEETING_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="meetings-published" className="text-xs font-medium">
            Compartilhado
          </label>
          <select
            id="meetings-published"
            name="published"
            defaultValue={values.published}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="meetings-from" className="text-xs font-medium">
            Data de
          </label>
          <input
            id="meetings-from"
            name="from"
            type="date"
            defaultValue={values.from}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="meetings-to" className="text-xs font-medium">
            Data até
          </label>
          <input
            id="meetings-to"
            name="to"
            type="date"
            defaultValue={values.to}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="meetings-integrationId"
            className="text-xs font-medium"
          >
            Integration ID
          </label>
          <input
            id="meetings-integrationId"
            name="integrationId"
            type="text"
            defaultValue={values.integrationId}
            placeholder="ID externo…"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          <Search className="size-3.5" />
          Filtrar
        </Button>
      </div>
    </form>
  );
}
