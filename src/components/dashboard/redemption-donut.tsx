"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";
import type { FraudSummary } from "@/lib/dashboard/types";

export function RedemptionDonut({ fraud }: { fraud: FraudSummary }) {
  const total = fraud.success + fraud.blocked + fraud.failed;
  const slices = [
    { name: "Thành công", value: fraud.success, color: "hsl(var(--primary))" },
    {
      name: "Chặn gian lận",
      value: fraud.blocked,
      color: "hsl(var(--destructive))",
    },
    { name: "Lỗi điều kiện", value: fraud.failed, color: "hsl(38 92% 50%)" },
  ];
  const pct = (value: number) => (total === 0 ? 0 : (value / total) * 100);
  const maxReason = Math.max(1, ...fraud.reasons.map((r) => r.count));

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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng áp mã
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatNumber(total)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            {formatPercent(pct(fraud.success))} hợp lệ
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.name}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatNumber(s.value)} · {formatPercent(pct(s.value))}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <p className="text-sm font-medium">Nguyên nhân chặn gian lận</p>
        {fraud.reasons.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="tabular-nums">{formatNumber(r.count)} lượt</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-destructive"
                style={{ width: `${(r.count / maxReason) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
