import { cn } from "@/lib/utils";

type FrameProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

/** Móvil con una captura real dentro. Proporción 800x1360 (las capturas están recortadas a ella). */
export function PhoneFrame({ src, alt, className, priority = false }: FrameProps) {
  return (
    <div
      className={cn(
        "relative aspect-[800/1360] w-full overflow-hidden rounded-[2.4rem] border-[9px] border-[#0b1218] bg-[#0b1218] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]",
        className,
      )}
    >
      <div className="size-full overflow-hidden rounded-[1.7rem] bg-[#0b1218] px-[3%] pb-[3%] pt-[9%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={800}
          height={1360}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="size-full rounded-[1.1rem] object-contain object-top"
        />
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-2.5 mx-auto h-4 w-20 rounded-full bg-black"
      />
    </div>
  );
}

/** Ventana de navegador con una captura real del panel. */
export function BrowserFrame({
  src,
  alt,
  url,
  className,
  width,
  height,
}: FrameProps & { url: string; width: number; height: number }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-[#0b1218] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="size-2.5 rounded-full bg-white/20" />
          <i className="size-2.5 rounded-full bg-white/20" />
          <i className="size-2.5 rounded-full bg-white/20" />
        </span>
        <span
          dir="ltr"
          className="mx-auto truncate rounded-full bg-white/10 px-4 py-1 text-xs text-white/60"
        >
          {url}
        </span>
        <span className="w-10" aria-hidden="true" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
    </div>
  );
}
