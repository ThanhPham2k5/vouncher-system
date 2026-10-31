"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactVnd, formatPercent, formatVnd } from "@/lib/format";
import { calcRoi } from "@/lib/dashboard/metrics";
import type { DailyPoint } from "@/lib/dashboard/types";

export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const series = data.map((d) => ({
    label: d.label,
    revenue: d.revenue,
    cost: d.cost,
    roi: calcRoi(d.cost, d.revenue),
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={series}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            yAxisId="money"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={64}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => formatCompactVnd(v)}
          />
          <YAxis
            yAxisId="roi"
            orientation="right"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => `${Math.round(v)}%`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value, name) => {
              const n = Number(value);
              return name === "ROI (%)" ? formatPercent(n) : formatVnd(n);
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="money"
            dataKey="revenue"
            name="Doanh thu"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="money"
            dataKey="cost"
            name="Chi phí chiết khấu"
            fill="hsl(var(--primary) / 0.35)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="roi"
            type="monotone"
            dataKey="roi"
            name="ROI (%)"
            stroke="hsl(152 60% 40%)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
