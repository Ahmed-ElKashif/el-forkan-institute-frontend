export interface LinePoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  points: LinePoint[];
  /** Y-axis maximum; defaults to the largest value (min 1). */
  max?: number;
  height?: number;
  formatValue?: (value: number) => string;
}

/** A minimal trend line — one SVG polyline over an area fill, no dependency.
 *  Time runs left→right (oldest first), so the group is LTR even on an RTL page,
 *  like the other numeric charts. Colours are Tailwind theme classes so no raw
 *  colour enters a component (the token check forbids it). */
export function LineChart({ points, max, height = 120, formatValue = String }: LineChartProps) {
  const width = 320;
  const pad = 6;
  const scale = Math.max(1, max ?? Math.max(...points.map((p) => p.value), 0));

  // Single point (or none) has no line to draw; the caller shows an empty state.
  const coords = points.map((point, i) => {
    const x = points.length <= 1 ? width / 2 : pad + (i / (points.length - 1)) * (width - 2 * pad);
    const y = height - pad - (point.value / scale) * (height - 2 * pad);
    return { x, y, point };
  });

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const last = coords[coords.length - 1];

  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" preserveAspectRatio="none" role="img">
        <polygon points={area} className="fill-teal-100" />
        <polyline points={line} fill="none" strokeWidth={2} className="stroke-teal-500" strokeLinejoin="round" />
        {last ? <circle cx={last.x} cy={last.y} r={3.5} className="fill-teal-600" /> : null}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink-500">
        <span>{coords[0]?.point.label}</span>
        {last ? (
          <span className="ef-num font-semibold text-ink-900">{formatValue(last.point.value)}</span>
        ) : null}
        <span>{last?.point.label}</span>
      </div>
    </div>
  );
}
