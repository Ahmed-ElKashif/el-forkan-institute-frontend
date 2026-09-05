import { cn } from '../cn';

export interface BarSegment {
  value: number;
  /** Tailwind fill class from a theme colour, e.g. `bg-teal-500`. */
  className: string;
  label: string;
}

export interface BarRow {
  label: string;
  segments: BarSegment[];
}

export interface BarChartProps {
  rows: BarRow[];
  /** Scale maximum; defaults to the largest row total so bars fill the track. */
  max?: number;
  formatValue?: (value: number) => string;
  legend?: { label: string; className: string }[];
}

/** Horizontal (stacked) bar chart in plain CSS — no SVG, no dependency, and it
 *  flows correctly in RTL because the track is a flex row of coloured segments.
 *  Colours arrive as Tailwind fill classes so every value stays a design token
 *  (the token check forbids raw colours in components). */
export function BarChart({ rows, max, formatValue = String, legend }: BarChartProps) {
  const scale = Math.max(1, max ?? Math.max(...rows.map(rowTotal), 0));

  return (
    <div className="space-y-3">
      {legend ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <span className={cn('size-2.5 rounded-full', item.className)} aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
            <span className="truncate text-sm text-ink-700" title={row.label}>
              {row.label}
            </span>
            <span className="flex h-6 overflow-hidden rounded-md bg-canvas">
              {row.segments.map((segment, i) =>
                segment.value > 0 ? (
                  <span
                    key={i}
                    className={cn('h-full', segment.className)}
                    style={{ width: `${(segment.value / scale) * 100}%` }}
                    title={`${segment.label}: ${formatValue(segment.value)}`}
                  />
                ) : null,
              )}
            </span>
            <span className="ef-num text-end text-sm font-semibold text-ink-900">
              {formatValue(rowTotal(row))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function rowTotal(row: BarRow): number {
  return row.segments.reduce((sum, segment) => sum + segment.value, 0);
}
