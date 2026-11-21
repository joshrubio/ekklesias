"use client";

import { useState } from "react";
import { NfcIcon } from "lucide-react";

type NdefWriter = {
  write: (message: { records: { recordType: string; data: string }[] }) => Promise<void>;
};

type State = "idle" | "waiting" | "done" | "error" | "unsupported";

const messages: Record<State, string> = {
  idle: "",
  waiting: "Acerca la etiqueta NFC a la parte trasera del móvil…",
  done: "Etiqueta grabada. Acércala a otro móvil para probarla.",
  error: "No se pudo grabar. Comprueba que la etiqueta admite escritura y vuelve a intentarlo.",
  unsupported:
    "Este navegador no puede escribir NFC. Usa Chrome en Android o copia el enlace en una app como NFC Tools.",
};

export function NfcWriter({ url }: { url: string }) {
  const [state, setState] = useState<State>("idle");

  async function write() {
    const Reader = (window as unknown as { NDEFReader?: new () => NdefWriter }).NDEFReader;
    if (!Reader) {
      setState("unsupported");
      return;
    }
    setState("waiting");
    try {
      await new Reader().write({ records: [{ recordType: "url", data: url }] });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={write}
        disabled={state === "waiting"}
        className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-3 font-medium hover:border-cyan disabled:opacity-60"
      >
        <NfcIcon className={`size-4 text-cyan ${state === "waiting" ? "animate-pulse" : ""}`} />
        Grabar en etiqueta NFC
      </button>
      {messages[state] ? (
        <p
          role={state === "error" || state === "unsupported" ? "alert" : "status"}
          className={`text-sm ${state === "done" ? "text-cyan-soft" : "text-muted"}`}
        >
          {messages[state]}
        </p>
      ) : null}
    </div>
  );
}
