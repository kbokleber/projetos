import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatusPillItem = {
  href: string;
  label: string;
  active?: boolean;
  Icon?: LucideIcon;
  count?: number;
};

export function StatusPills({
  items,
  className,
}: {
  items: StatusPillItem[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            item.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {item.Icon && <item.Icon className="size-3.5" />}
          {item.label}
          {typeof item.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                item.active
                  ? "bg-primary-foreground/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
