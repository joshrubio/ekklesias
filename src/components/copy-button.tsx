"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label,
  doneLabel,
}: {
  text: string;
  label: string;
  doneLabel: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="rounded-full bg-brand glow-btn px-4 py-3 font-semibold text-brand-foreground"
    >
      {done ? doneLabel : label}
    </button>
  );
}
