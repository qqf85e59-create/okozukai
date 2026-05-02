"use client";

export type BarDatum = { label: string; value: number };

type Props = {
  data: BarDatum[];
  color?: string;
  formatValue?: (v: number) => string;
  emptyLabel?: string;
};

export function BarChart({ data, color = "#6366F1", formatValue, emptyLabel = "データなし" }: Props) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="text-center text-gray-400 text-sm py-8">{emptyLabel}</p>;
  }

  const BAR_W = 32;
  const GAP = 16;
  const CHART_H = 100;
  const VALUE_AREA = 20;
  const LABEL_AREA = 20;
  const totalW = data.length * (BAR_W + GAP) + GAP;
  const svgH = VALUE_AREA + CHART_H + LABEL_AREA;

  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatValue ?? String;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${svgH}`}
        style={{ width: "100%", minWidth: totalW, height: svgH }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * CHART_H, d.value > 0 ? 4 : 0);
          const x = i * (BAR_W + GAP) + GAP;
          const y = VALUE_AREA + (CHART_H - barH);

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                fill={d.value > 0 ? color : "#E5E7EB"}
                rx={5}
              />
              {d.value > 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize={8}
                  fill="#4B5563"
                  fontWeight="700"
                >
                  {fmt(d.value)}
                </text>
              )}
              <text
                x={x + BAR_W / 2}
                y={VALUE_AREA + CHART_H + 14}
                textAnchor="middle"
                fontSize={9}
                fill="#9CA3AF"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
