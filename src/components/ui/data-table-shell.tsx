import { cn } from "@/lib/utils";

export function DataTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full min-w-[640px] text-left text-sm", className)}>
      {children}
    </table>
  );
}

export function DataTableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={cn(
        "border-b border-border bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function DataTableTh({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5 font-semibold", className)}>{children}</th>
  );
}

export function DataTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

export function DataTableRow({
  children,
  className,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 transition-colors hover:bg-muted/40",
        selected &&
          "bg-primary/5 shadow-[inset_3px_0_0_0_var(--nav-rail)] hover:bg-primary/10",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableTd({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>
  );
}
