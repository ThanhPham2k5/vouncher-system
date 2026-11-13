"use client";

import { Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardEvent } from "@/lib/dashboard/use-dashboard-stream";

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

export function LiveFeed({
  events,
  connected,
}: {
  events: DashboardEvent[];
  connected: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-primary" />
          Hoạt động realtime
        </CardTitle>
        <Badge variant={connected ? "success" : "muted"}>
          {connected ? "Đang kết nối" : "Mất kết nối"}
        </Badge>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có lượt áp mã mới.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {events.map((e, i) => (
              <li
                key={`${e.occurredAt}-${i}`}
                className="flex justify-between py-2"
              >
                <span className="font-mono">{e.code ?? "—"}</span>
                <span className="text-primary">
                  -{formatVnd(e.discountAmount ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.occurredAt).toLocaleTimeString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
