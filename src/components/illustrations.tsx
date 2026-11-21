import { cn } from "@/lib/utils";

export type BackdropName = "waves" | "swell";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
};

function Waves() {
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 70 C 200 30, 400 110, 600 70 S 1000 30, 1200 70" {...stroke} />
      <path d="M0 110 C 200 70, 400 150, 600 110 S 1000 70, 1200 110" {...stroke} />
    </svg>
  );
}

function Swell() {
  return (
    <svg viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 120 C 240 40, 420 200, 660 120 S 1020 40, 1200 100" {...stroke} />
    </svg>
  );
}

const illustrations: Record<BackdropName, () => React.ReactElement> = {
  waves: Waves,
  swell: Swell,
};

/**
 * Onda decorativa de fondo. El contenedor padre necesita `relative isolate`
 * y `overflow-hidden`; queda detrás del contenido gracias a `-z-10`.
 */
export function Backdrop({ name, className }: { name: BackdropName; className?: string }) {
  const Illustration = illustrations[name];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -z-10 text-cyan opacity-[0.2] [&>svg]:h-full [&>svg]:w-full",
        className,
      )}
    >
      <Illustration />
    </div>
  );
}
