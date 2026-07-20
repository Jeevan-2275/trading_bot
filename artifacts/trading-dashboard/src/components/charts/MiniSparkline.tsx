import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function MiniSparkline({ data, positive, width = 80, height = 28, className }: Props) {
  const { linePath, fillPath } = useMemo(() => {
    if (!data || data.length < 2) return { linePath: "", fillPath: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const pts = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return [x, y] as [number, number];
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
    const fill = `${line} L ${pts[pts.length - 1][0]},${height} L ${pts[0][0]},${height} Z`;
    return { linePath: line, fillPath: fill };
  }, [data, width, height]);

  if (!linePath) return <div style={{ width, height }} className={className} />;

  const color = positive ? "#10b981" : "#ef4444";
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  return (
    <svg width={width} height={height} className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${uid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
