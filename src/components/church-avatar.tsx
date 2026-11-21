import { logoUrl } from "@/lib/logo";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  logoPath?: string | null;
  className?: string;
};

/** Logo de la iglesia; si no hay, la inicial sobre el color principal. */
export function ChurchAvatar({ name, logoPath, className }: Props) {
  const src = logoUrl(logoPath);
  const base = "inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={56}
        height={56}
        className={cn(base, "bg-white object-contain p-1 ring-1 ring-border", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(base, "bg-brand font-display text-xl font-semibold text-brand-foreground", className)}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
