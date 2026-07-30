"use client";

import type { EmotionHistoryPoint } from "@/types";

interface Props {
  history: EmotionHistoryPoint[];
}

const SERIES: { key: keyof EmotionHistoryPoint; color: string; label: string }[] = [
  { key: "anger", color: "#ef4444", label: "Anger" },
  { key: "frustration", color: "#f97316", label: "Frustration" },
  { key: "trust", color: "#34d399", label: "Trust" },
  { key: "calmness", color: "#60a5fa", label: "Calmness" },
];

export function EmotionJourneyChart({ history }: Props) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-slate-400">No emotion data recorded for this session.</p>;
  }

  const width = 640;
  const height = 220;
  const padding = 32;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const n = history.length;

  const xFor = (i: number) => padding + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (v: number) => padding + innerH - v * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Emotion journey over the conversation">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={padding} x2={width - padding}
            y1={yFor(g)} y2={yFor(g)}
            stroke="#334155" strokeWidth="1"
          />
        ))}
        {SERIES.map((s) => {
          const points = history.map((h, i) => `${xFor(i)},${yFor(Number(h[s.key]))}`).join(" ");
          return (
            <polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
        {history.map((h, i) => (
          <text key={i} x={xFor(i)} y={height - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">
            {i}
          </text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
