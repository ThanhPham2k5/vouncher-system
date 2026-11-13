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
import { calcRoi } from "@/lib/dashboard/metrics";
import type { DailyPoint } from "@/lib/dashboard/types";
import {
  formatCompactVnd,
  formatNumber,
  formatSignedPercent,
  formatVnd,
} from "@/lib/format";

const ROI_NAME = "ROI cận trên (%)";
const REDEMPTION_NAME = "Lượt dùng";

export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const series = data.map((d) => ({
    label: d.label,
    revenue: d.revenue,
    cost: d.cost,
    redemptions: d.redemptions ?? 0,
    // Không có tiền giảm thì không có ROI cho bucket đó
    roi: d.cost === 0 ? null : calcRoi(d.cost, d.revenue),
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
            width={64}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => `${Math.round(v)}%`}
          />
          {/* Trục lượt dùng ẩn, chỉ để scale đường. Giá trị hiện trong tooltip. */}
          <YAxis yAxisId="count" hide />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value, name) => {
              if (value === null || value === undefined) return "—";
              const n = Number(value);
              if (name === ROI_NAME) return formatSignedPercent(n);
              if (name === REDEMPTION_NAME) return formatNumber(n);
              return formatVnd(n);
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="money"
            dataKey="revenue"
            name="Doanh thu có mã"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="money"
            dataKey="cost"
            name="Tiền đã giảm"
            fill="hsl(var(--primary) / 0.35)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="redemptions"
            name={REDEMPTION_NAME}
            stroke="hsl(38 92% 50%)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
          <Line
            yAxisId="roi"
            type="monotone"
            dataKey="roi"
            name={ROI_NAME}
            stroke="hsl(152 60% 40%)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
