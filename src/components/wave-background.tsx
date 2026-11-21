"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const WIDTH = 1440;
const HEIGHT = 640;
const STEP = 20;

type Layer = {
  base: number;
  amp: number;
  freq: number;
  speed: number;
  amp2: number;
  freq2: number;
  speed2: number;
  fill: number;
  stroke: number;
};

const layers: Layer[] = [
  { base: 330, amp: 26, freq: 0.0042, speed: 0.55, amp2: 12, freq2: 0.011, speed2: -0.8, fill: 0.05, stroke: 0.35 },
  { base: 380, amp: 32, freq: 0.0036, speed: -0.45, amp2: 14, freq2: 0.009, speed2: 0.7, fill: 0.07, stroke: 0.3 },
  { base: 435, amp: 28, freq: 0.0048, speed: 0.4, amp2: 10, freq2: 0.013, speed2: -0.6, fill: 0.09, stroke: 0.28 },
  { base: 490, amp: 34, freq: 0.0032, speed: -0.35, amp2: 16, freq2: 0.008, speed2: 0.5, fill: 0.12, stroke: 0.25 },
  { base: 550, amp: 24, freq: 0.0052, speed: 0.3, amp2: 9, freq2: 0.014, speed2: -0.45, fill: 0.16, stroke: 0.2 },
];

function wavePath(layer: Layer, t: number, close: boolean) {
  let d = "";
  for (let x = 0; x <= WIDTH; x += STEP) {
    const y =
      layer.base +
      layer.amp * Math.sin(x * layer.freq + t * layer.speed) +
      layer.amp2 * Math.sin(x * layer.freq2 + t * layer.speed2);
    d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)} `;
  }
  if (close) d += `L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  return d;
}

export function WaveBackground({ className = "" }: { className?: string }) {
  const fillRefs = useRef<(SVGPathElement | null)[]>([]);
  const lineRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const draw = (t: number) => {
      layers.forEach((layer, i) => {
        fillRefs.current[i]?.setAttribute("d", wavePath(layer, t, true));
        lineRefs.current[i]?.setAttribute("d", wavePath(layer, t, false));
      });
    };

    draw(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    const tick = () => draw((performance.now() - start) / 1000);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0891b2" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {layers.map((layer, i) => (
        <g key={i}>
          <path
            ref={(el) => {
              fillRefs.current[i] = el;
            }}
            fill="url(#wave-fill)"
            opacity={layer.fill}
          />
          <path
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            fill="none"
            stroke="url(#wave-line)"
            strokeWidth="1.5"
            opacity={layer.stroke}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
