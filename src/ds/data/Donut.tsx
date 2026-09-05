import type { ReactNode } from 'react';
import { cn } from '../cn';

export interface DonutSegment {
  value: number;
  /** Tailwind stroke class from a theme colour, e.g. `stroke-success`. */
  className: string;
  label: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
}

/** A ring chart: each segment is an arc of one SVG circle, drawn with a
 *  dash-array so no path maths is needed. Colours are Tailwind `stroke-*` theme
 *  classes (the token check forbids raw colours), and the whole ring is
 *  presentational — the legend beside it carries the meaning. */
export function Donut({ segments, size = 168, thickness = 20, centerValue, centerLabel }: DonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Each arc's length and its start offset (the sum of the arcs before it),
  // precomputed so the render below only reads — no accumulator to mutate.
  const lengths = segments.map((s) => (s.value / total) * circumference);
  const offsets = prefixSums(lengths);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      {/* -90° so the first segment starts at twelve o'clock. */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-line-200"
        />
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeDasharray={`${lengths[i]} ${circumference - lengths[i]}`}
            strokeDashoffset={-offsets[i]}
            className={cn(segment.className)}
          />
        ))}
      </svg>
      {centerValue != null || centerLabel != null ? (
        <div className="absolute grid place-items-center text-center leading-tight">
          {centerValue != null ? (
            <span className="ef-num text-3xl font-bold text-ink-900">{centerValue}</span>
          ) : null}
          {centerLabel != null ? <span className="text-xs text-ink-500">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Running totals: `[0, v0, v0+v1, …]` — each arc's start offset. */
function prefixSums(values: number[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const value of values) {
    out.push(sum);
    sum += value;
  }
  return out;
}
