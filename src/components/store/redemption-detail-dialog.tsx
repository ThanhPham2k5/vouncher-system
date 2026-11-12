"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RedemptionRecord } from "@/lib/store-history";

function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN");
}

interface RedemptionDetailDialogProps {
  record: RedemptionRecord | null;
  onOpenChange: (open: boolean) => void;
}

export function RedemptionDetailDialog({
  record,
  onOpenChange,
}: RedemptionDetailDialogProps) {
  const success = record?.status === "SUCCESS";
  const paid = record ? record.originalAmount - record.discountAmount : 0;
  const savingPct =
    record && record.originalAmount > 0
      ? ((record.discountAmount / record.originalAmount) * 100).toFixed(1)
      : "0";

  return (
    <Dialog open={!!record} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {record && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Chi tiết lần áp mã khuyến mãi</DialogTitle>
                {success ? (
                  <Badge variant="success">Áp mã thành công</Badge>
                ) : (
                  <Badge variant="destructive">Thất bại</Badge>
                )}
              </div>
              <DialogDescription className="font-mono text-xs">
                Mã giao dịch: #{record.transactionRef} •{" "}
                {formatDateTime(record.appliedAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Giá trị đơn gốc</p>
                <p className="font-semibold">
                  {formatVnd(record.originalAmount)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  Mức chiết khấu thực tế
                </p>
                <p className="font-semibold text-primary">
                  {success ? `-${formatVnd(record.discountAmount)}` : "0 ₫"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tiết kiệm {savingPct}% đơn hàng
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">
                  Thực thu sau áp mã
                </p>
                <p className="font-semibold text-primary">{formatVnd(paid)}</p>
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="font-semibold">Thông tin voucher</h3>
              <dl className="space-y-3 rounded-lg border p-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Mã voucher</dt>
                  <dd className="font-mono font-semibold">{record.code}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phần thưởng</dt>
                  <dd>{record.headline || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Điều kiện</dt>
                  <dd>
                    {record.conditions.length > 0 ? (
                      <ul className="space-y-0.5">
                        {record.conditions.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            {!success && record.blockedReason && (
              <p className="text-sm text-destructive">
                Lí do: {record.blockedReason}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng cửa sổ
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
