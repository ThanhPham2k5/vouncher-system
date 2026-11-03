"use client";

import { Check, Copy, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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

  async function copyCode() {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.code);
      toast.success("Đã sao chép mã", { description: record.code });
    } catch {
      toast.error("Không sao chép được mã");
    }
  }

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
                  <Badge variant="destructive">Bị chặn</Badge>
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
              <h3 className="font-semibold">
                Thông tin quy tắc và điều kiện voucher
              </h3>
              <dl className="grid grid-cols-1 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Mã voucher áp dụng
                  </dt>
                  <dd className="font-mono font-semibold">{record.code}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Loại quy tắc áp dụng
                  </dt>
                  <dd>{record.ruleType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Điều kiện giỏ hàng tối thiểu
                  </dt>
                  <dd>
                    Đơn tối thiểu ≥ {formatVnd(record.minBasket)}
                    {record.originalAmount >= record.minBasket
                      ? " (Đạt)"
                      : " (Chưa đạt)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Hạn sử dụng của voucher
                  </dt>
                  <dd>{formatDateTime(record.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Chiến dịch phân phối
                  </dt>
                  <dd>{record.campaignTitle}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Kênh phân phối
                  </dt>
                  <dd>{record.channel}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Kiểm soát an ninh gian lận (Fraud Shield)
              </h3>
              <div className="space-y-2 rounded-lg bg-primary/5 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Điểm tín nhiệm</span>
                  <Badge
                    variant={
                      record.trustScore >= 80 ? "success" : "destructive"
                    }
                  >
                    {record.trustScore} / 100
                  </Badge>
                </div>
                <p>
                  <span className="text-muted-foreground">
                    Địa chỉ IP và nhà mạng:{" "}
                  </span>
                  <span className="font-mono">{record.ip}</span> ({record.isp})
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Thiết bị và môi trường:{" "}
                  </span>
                  {record.device}
                </p>
                <p>
                  <span className="text-muted-foreground">
                    Ghi chú thẩm định:{" "}
                  </span>
                  <span className="font-medium">{record.auditNote}</span>
                </p>
                {!success && record.blockedReason && (
                  <p className="text-destructive">
                    Lí do chặn: {record.blockedReason}
                  </p>
                )}
              </div>
            </section>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Đóng cửa sổ
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                  Sao chép mã voucher
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  In hóa đơn đối soát
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
