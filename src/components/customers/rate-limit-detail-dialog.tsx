"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RateLimitConfigResponse } from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { formatNumber } from "@/lib/format";
import { ACTION_LABEL, LIMIT_SCOPE_LABEL } from "./security-meta";

interface RateLimitDetailDialogProps {
  item: RateLimitConfigResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function RateLimitDetailDialog({
  item,
  onOpenChange,
}: RateLimitDetailDialogProps) {
  const lines = item
    ? [
        { label: "Endpoint", value: item.endpointPattern },
        { label: "Phạm vi", value: LIMIT_SCOPE_LABEL[item.scope] },
        {
          label: "Giới hạn",
          value: `${formatNumber(item.maxRequest)} request / ${formatNumber(item.timeWindowSeconds)} giây`,
        },
        { label: "Khi vượt ngưỡng", value: ACTION_LABEL[item.actionOnExceed] },
        { label: "Ưu tiên", value: String(item.priority) },
        { label: "Tạo lúc", value: formatDateTime(item.createAt) },
      ]
    : [];

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item?.name}</DialogTitle>
          <DialogDescription>Cấu hình rate limit #{item?.id}</DialogDescription>
        </DialogHeader>

        {item && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.isActive ? "success" : "muted"}>
                {item.isActive ? "Đang bật" : "Đã tắt"}
              </Badge>
            </div>

            <dl className="space-y-2 rounded-lg border p-4">
              {lines.map((line) => (
                <div
                  key={line.label}
                  className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3"
                >
                  <dt className="text-muted-foreground">{line.label}</dt>
                  <dd className="break-words font-medium">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
