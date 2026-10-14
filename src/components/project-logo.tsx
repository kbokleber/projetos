import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  logoPath: string | null | undefined;
  color?: string | null;
  /** card = miniatura na lista; header = logo na página do projeto */
  size?: "card" | "header" | "form";
  className?: string;
  /** bust de cache quando o logo muda */
  updatedAt?: Date | string | null;
};

export function ProjectLogo({
  projectId,
  logoPath,
  color,
  size = "card",
  className,
  updatedAt,
}: Props) {
  const dims =
    size === "header"
      ? "size-16 rounded-xl sm:size-20"
      : size === "form"
        ? "size-24 rounded-xl"
        : "size-12 rounded-lg";

  if (logoPath) {
    const v = updatedAt
      ? `?v=${encodeURIComponent(
          typeof updatedAt === "string"
            ? updatedAt
            : updatedAt.toISOString(),
        )}`
      : "";
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/projects/${projectId}/logo${v}`}
        alt=""
        className={cn(
          dims,
          "shrink-0 bg-background object-contain p-1.5 ring-1 ring-border",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        dims,
        "inline-flex shrink-0 items-center justify-center bg-muted ring-1 ring-border",
        className,
      )}
      style={color ? { background: color } : undefined}
      aria-hidden
    />
  );
}
