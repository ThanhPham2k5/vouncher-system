"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BlackListResponse } from "@/lib/campaigns/be-types";
import { formatDateTime } from "@/lib/campaigns/format";
import { BLACKLIST_TYPE_LABEL } from "./security-meta";

const STATE_META = {
  ACTIVE: { label: "Đang chặn", variant: "destructive" },
  INACTIVE: { label: "Đã gỡ chặn", variant: "muted" },
} as const;

function stateOf(b: BlackListResponse): keyof typeof STATE_META {
  return b.isActive ? "ACTIVE" : "INACTIVE";
}

interface BlacklistDetailDialogProps {
  item: BlackListResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function BlacklistDetailDialog({
  item,
  onOpenChange,
}: BlacklistDetailDialogProps) {
  const state = item ? STATE_META[stateOf(item)] : null;

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {item && state && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Chi tiết danh sách đen #{item.id}</DialogTitle>
                <Badge variant={state.variant}>{state.label}</Badge>
              </div>
              <DialogDescription>
                {BLACKLIST_TYPE_LABEL[item.type]} · {item.value}
              </DialogDescription>
            </DialogHeader>

            <section className="space-y-2">
              <h3 className="font-semibold">Thông tin chặn</h3>
              <dl className="divide-y rounded-lg border px-4 text-sm">
                <Row label="Loại">{BLACKLIST_TYPE_LABEL[item.type]}</Row>
                <Row label="Giá trị">
                  <span className="break-all font-mono">{item.value}</span>
                </Row>
                <Row label="Lý do">{item.reason || "—"}</Row>
                <Row label="Trạng thái">
                  <Badge variant={state.variant}>{state.label}</Badge>
                </Row>
                <Row label="Hết hạn">
                  {item.expiredAt
                    ? formatDateTime(item.expiredAt)
                    : "Vĩnh viễn"}
                </Row>
                <Row label="Tạo lúc">{formatDateTime(item.createAt)}</Row>
              </dl>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{children}</dd>
    </div>
  );
}
