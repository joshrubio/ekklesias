import { NfcIcon } from "lucide-react";
import { qrDataUri, qrSvg } from "@/lib/qr";

const DEMO_URL = `${(process.env.SITE_URL ?? "https://ekklesias.vercel.app").replace(/\/$/, "")}/c/lifepoint`;

/** Tarjeta con un QR real que abre la iglesia de demostración. */
export async function QrCard({ label, hint }: { label: string; hint: string }) {
  const src = qrDataUri(await qrSvg(`${DEMO_URL}?s=qr`));

  return (
    <div className="relative mx-auto flex w-full max-w-sm flex-col gap-5 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#0f2230] to-[#07111a] p-7 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between text-white">
        <span className="font-display text-xl font-semibold">{label}</span>
        <NfcIcon className="size-6 text-cyan" aria-hidden="true" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={hint}
        width={240}
        height={240}
        className="mx-auto size-60 rounded-2xl bg-white p-3"
      />
      <p className="text-center text-sm text-white/60">{hint}</p>
    </div>
  );
}
