import { CopyButton } from "@/components/copy-button";
import { NfcWriter } from "@/components/nfc-writer";

type Props = {
  title: string;
  help: string;
  basePath: string;
  qrUrl: string;
  nfcUrl: string;
};

const linkClass =
  "rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-cyan";

export function QrPanel({ title, help, basePath, qrUrl, nfcUrl }: Props) {
  const join = (query: string) => `${basePath}${basePath.includes("?") ? "&" : "?"}${query}`;

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted">{help}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Código QR</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={join("s=qr")}
            alt="Código QR"
            width={192}
            height={192}
            className="size-48 rounded-md bg-white"
          />
          <p dir="ltr" className="break-all text-xs text-muted">
            {qrUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={join("s=qr&download=1")} className={linkClass}>
              Descargar SVG
            </a>
            <a href={join("s=qr&download=1&format=png")} className={linkClass}>
              Descargar PNG
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Etiqueta NFC</h3>
          <p dir="ltr" className="break-all rounded-md bg-background p-3 text-xs">
            {nfcUrl}
          </p>
          <div>
            <CopyButton text={nfcUrl} label="Copiar enlace" doneLabel="Copiado" />
          </div>
          <NfcWriter url={nfcUrl} />
        </div>
      </div>
    </section>
  );
}
