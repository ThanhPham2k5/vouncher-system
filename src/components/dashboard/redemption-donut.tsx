"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";
import type { FraudSummary } from "@/lib/dashboard/types";

// Chỉ hiển thị trạng thái áp mã: thành công và thất bại.
// Số liệu gian lận không hiển thị ở đây.
export function RedemptionDonut({
  status,
}: {
  status: Pick<FraudSummary, "success" | "failed">;
}) {
  const total = status.success + status.failed;
  const slices = [
    { name: "Thành công", value: status.success, color: "hsl(var(--primary))" },
    { name: "Thất bại", value: status.failed, color: "hsl(38 92% 50%)" },
  ];
  const successRate = total === 0 ? 0 : (status.success / total) * 100;

  return (
    <div className="space-y-5">
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng lượt áp mã
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatNumber(total)}
          </p>
          <p className="whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400">
            {formatPercent(successRate)} thành công
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {slices.map((s) => {
          const pct = total === 0 ? 0 : (s.value / total) * 100;
          return (
            <li
              key={s.name}
              className="flex items-center justify-between gap-3 whitespace-nowrap"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatNumber(s.value)} · {formatPercent(pct)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
